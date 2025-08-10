import * as logger from "firebase-functions/logger";

export class LoggingProxy {
  static create<T extends object>(target: T, className: string, logParameters: boolean = true): T {
    return new Proxy(target, {
      get(target, prop, receiver) {
        const originalValue = Reflect.get(target, prop, receiver);
        
        if (typeof originalValue === 'function') {
          return function(...args: any[]) {
            const startTime = Date.now();
            
            logger.info(`Starting`, {
              className,
              methodName: String(prop),
              ...(logParameters && { parameters: args })
            });
            
            try {
              const result = originalValue.apply(target, args);
              
              // Check if the result is a Promise (async method)
              if (result && typeof result.then === 'function') {
                return result
                  .then((resolvedResult: any) => {
                    const executionTime = Date.now() - startTime;
                    
                    logger.info(`Completed`, {
                      className,
                      methodName: String(prop),
                      executionTime,
                      result: resolvedResult
                    });
                    
                    return resolvedResult;
                  })
                  .catch((error: any) => {
                    const executionTime = Date.now() - startTime;
                    
                    logger.error(`Failed`, {
                      className,
                      methodName: String(prop),
                      executionTime,
                      error: error instanceof Error ? error.message : String(error)
                    });
                    
                    throw error;
                  });
              } else {
                // Synchronous method
                const executionTime = Date.now() - startTime;
                
                logger.info(`Completed`, {
                  className,
                  methodName: String(prop),
                  executionTime,
                  result: result
                });
                
                return result;
              }
            } catch (error) {
              const executionTime = Date.now() - startTime;
              
              logger.error(`Failed`, {
                className,
                methodName: String(prop),
                executionTime,
                error: error instanceof Error ? error.message : String(error)
              });
              
              throw error;
            }
          };
        }
        
        return originalValue;
      }
    });
  }

  static createWithoutParameters<T extends object>(target: T, className: string): T {
    return this.create(target, className, false);
  }
}
