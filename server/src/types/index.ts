// Re-export shared types for use within the server
export * from '../../../shared/types/index';

export interface AuthPayload {
  userId: string;
  username: string;
}
