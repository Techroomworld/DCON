/**
 * User Types
 */
export interface User {
  userId: string;
  name: string;
  email?: string;
  role: 'teacher' | 'student';
  avatar?: string;
  status: 'online' | 'offline' | 'away';
}

/**
 * Classroom Types
 */
export interface Classroom {
  id: string;
  name: string;
  subject: string;
  instructor: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  participants: Participant[];
}

/**
 * Participant Types
 */
export interface Participant {
  id: string;
  name: string;
  email?: string;
  role: 'teacher' | 'student';
  avatar?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
}

/**
 * Message Types
 */
export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
  isTeacher: boolean;
  readBy?: string[];
}

/**
 * Chat Types
 */
export interface ChatMessage extends Message {
  attachments?: string[];
}

/**
 * Resource Types
 */
export interface Resource {
  id: string;
  title: string;
  description?: string;
  type: 'document' | 'image' | 'video' | 'link';
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  size?: number;
}

/**
 * Whiteboard Types
 */
export interface WhiteboardData {
  id: string;
  roomId: string;
  strokes: Stroke[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}