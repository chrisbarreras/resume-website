import { Storage } from '@google-cloud/storage';
import { JobPostData } from "../types/JobPostData";
import { Logger } from "../utils/Logger";

export class JobScrapingService {
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly log = Logger.create('JobReadingService');

  constructor(bucketName: string = 'job_posts_resume') {
    // Firebase Functions automatically authenticate with Google Cloud services
    this.storage = new Storage();
    this.bucketName = bucketName;
  }

  async readJobPost(jobPostFileName: string): Promise<JobPostData | null> {
    try {
      this.log.info('readJobPost', 'Starting job post file reading', { jobPostFileName });

      const fileContent = await this.readFileFromBucket(jobPostFileName + '.txt');
      if (!fileContent) {
        this.log.error('readJobPost', 'File content is empty or null', { jobPostFileName });
        return null;
      }

      const jobPostData = this.parseJobPostFile(fileContent);

      this.log.note('readJobPost', 'Job post file reading completed', {
        jobPostFileName,
        hasResult: !!jobPostData,
        companyName: jobPostData?.companyName,
        jobTitle: jobPostData?.jobTitle
      });

      return jobPostData;
    } catch (error) {
      this.log.error('readJobPost', 'Error reading job post file', { jobPostFileName, error });
      return null;
    }
  }

  private async readFileFromBucket(fileName: string): Promise<string | null> {
    try {
      this.log.debug('readFileFromBucket', 'Reading file from bucket', { fileName, bucketName: this.bucketName });
      
      const bucket = this.storage.bucket(this.bucketName);
      
      // First, let's verify the bucket exists and is accessible
      try {
        await bucket.getMetadata();
        this.log.debug('readFileFromBucket', 'Bucket is accessible', { bucketName: this.bucketName });
      } catch (bucketError) {
        this.log.error('readFileFromBucket', 'Cannot access bucket', { 
          bucketName: this.bucketName, 
          error: bucketError 
        });
        return null;
      }
      
      const file = bucket.file(fileName);
      
      const [exists] = await file.exists();
      if (!exists) {
        this.log.error('readFileFromBucket', 'File does not exist', { fileName, bucketName: this.bucketName });
        return null;
      }

      const [contents] = await file.download();
      const fileContent = contents.toString('utf-8');
      
      this.log.debug('readFileFromBucket', 'File read successfully', { 
        fileName, 
        contentLength: fileContent.length 
      });
      
      return fileContent;
    } catch (error) {
      this.log.error('readFileFromBucket', 'Error reading file from bucket', { fileName, error });
      return null;
    }
  }

  private parseJobPostFile(fileContent: string): JobPostData | null {
    try {
      const lines = fileContent.split('\n');
      
      if (lines.length < 3) {
        this.log.error('parseJobPostFile', 'File format invalid - needs at least 3 lines', { 
          linesCount: lines.length 
        });
        return null;
      }

      // Line 1: Job Title
      const jobTitle = lines[0]?.trim() || "Unknown Position";
      
      // Line 2: Company Name
      const companyName = lines[1]?.trim() || "Unknown Company";
      
      // Rest: Job Description
      const jobDescription = lines.slice(2).join('\n').trim() || "No description available";

      return {
        companyName,
        jobTitle,
        jobDescription
      };
    } catch (error) {
      this.log.error('parseJobPostFile', 'Error parsing job post file', { error });
      return null;
    }
  }

  // Utility method to list all job post files in the bucket
  async listJobPostFiles(): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({ prefix: '' });
      
      const fileNames = files
        .filter(file => file.name.endsWith('.txt'))
        .map(file => file.name);
      this.log.info('listJobPostFiles', 'Listed job post files', { 
        count: fileNames.length,
        files: fileNames 
      });
      
      return fileNames;
    } catch (error) {
      this.log.error('listJobPostFiles', 'Error listing files from bucket', { error });
      return [];
    }
  }
}