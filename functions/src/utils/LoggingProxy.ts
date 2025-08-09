import * as logger from "firebase-functions/logger";

export class LoggingProxy {
  static create<T extends object>(target: T, className: string): T {
    return new Proxy(target, {
      get(target, prop, receiver) {
        const originalValue = Reflect.get(target, prop, receiver);
        
        if (typeof originalValue === 'function') {
          return async function(...args: any[]) {
            const methodName = `${className}.${String(prop)}`;
            const startTime = Date.now();
            
            logger.info(`[${methodName}] Starting`, {
              parameters: args.length > 0 ? args : undefined
            });
            
            try {
              const result = await originalValue.apply(target, args);
              const executionTime = Date.now() - startTime;
              
              logger.info(`[${methodName}] Completed`, {
                executionTime,
                result: result
              });
              
              return result;
            } catch (error) {
              const executionTime = Date.now() - startTime;
              
              logger.error(`[${methodName}] Failed`, {
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
}
