export interface ItineraryItem {
  date: string;
  day: string;
  time?: string;
  activity: string;
  location: string;
  hotel?: string;
  notes?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  timestamp: Date;
}
