import { ItineraryItem } from './types';

export const ITINERARY: ItineraryItem[] = [
  { date: '26 March', day: 'Thursday', time: '21:15', activity: 'Flight Gatwick to Bangkok', location: 'Gatwick' },
  { date: '27 March', day: 'Friday', time: '16:05', activity: 'Flight arrives Bangkok', location: 'Bangkok' },
  { date: '27 March', day: 'Friday', time: '19:15', activity: 'Flight leave Bangkok to Samui', location: 'Bangkok' },
  { date: '27 March', day: 'Friday', time: '20:25', activity: 'Flight arrives in Samui', location: 'Samui', hotel: 'Cielo' },
  { date: '28 March', day: 'Saturday', activity: 'SAMUI', location: 'Samui', hotel: 'Cielo' },
  { date: '29 March', day: 'Sunday', activity: 'SAMUI', location: 'Samui', hotel: 'Cielo' },
  { date: '30 March', day: 'Monday', time: '15:30', activity: 'Travel Samui to Kho Tao (2hrs)', location: 'Samui/Kho Tao', hotel: 'Tanote Villas' },
  { date: '31 March', day: 'Tuesday', activity: 'Kho Tao', location: 'Kho Tao', hotel: 'Tanote Villas' },
  { date: '1 April', day: 'Wednesday', activity: 'Kho Tao', location: 'Kho Tao', hotel: 'Tanote Villas' },
  { date: '2 April', day: 'Thursday', activity: 'Kho Tao', location: 'Kho Tao', hotel: 'Tanote Villas' },
  { date: '3 April', day: 'Thursday', time: '15:30', activity: 'Travel Kho Tao to Pangan (1:15 hrs)', location: 'Kho Tao/Pangan', hotel: 'Salad Hut' },
  { date: '4 April', day: 'Saturday', activity: 'Pangan', location: 'Pangan', hotel: 'Salad Hut' },
  { date: '5 April', day: 'Sunday', activity: 'Pangan', location: 'Pangan', hotel: 'Salad Hut' },
  { date: '6 April', day: 'Monday', activity: 'Pangan', location: 'Pangan', hotel: 'Buri Rasa' },
  { date: '7 April', day: 'Tuesday', activity: 'Pangan', location: 'Pangan', hotel: 'Buri Rasa' },
  { date: '8 April', day: 'Wednesday', activity: 'Pangan', location: 'Pangan', hotel: 'Buri Rasa' },
  { date: '9 April', day: 'Thursday', activity: 'Pangan', location: 'Pangan', hotel: 'Buri Rasa' },
  { date: '10 April', day: 'Friday', time: '10:30', activity: 'Travel Kho Pangan - Samui (1:30 hrs)', location: 'Pangan/Samui' },
  { date: '10 April', day: 'Friday', time: '15:25', activity: 'Flight Samui to Bangkok', location: 'Samui' },
  { date: '10 April', day: 'Friday', time: '16:40', activity: 'Arrive Bangkok', location: 'Bangkok', hotel: 'Chatrium Grand' },
  { date: '11 April', day: 'Saturday', activity: 'Bangkok', location: 'Bangkok', hotel: 'Chatrium Grand' },
  { date: '12 April', day: 'Sunday', time: '22:35', activity: 'Flight Bangkok to London Gatwick - BA', location: 'Bangkok' },
  { date: '13 April', day: 'Monday', time: '05:55', activity: 'Flight arrives Gatwick', location: 'Gatwick' },
];

export const SYSTEM_PROMPT = `
You are our private travel assistant for a family-and-friends trip to Thailand.
Group details:
- 4 adults
- 4 kids: two aged 11 and two aged 7
- We are all from London, use UK-style English, times, and spelling.

Itinerary (Single Source of Truth):
${ITINERARY.map(item => `- ${item.date} (${item.day}): ${item.time ? item.time + ' ' : ''}${item.activity} at ${item.location}${item.hotel ? ' (Hotel: ' + item.hotel + ')' : ''}`).join('\n')}

Your jobs:
1. Answer questions about our plan.
2. Create daily briefings on request (today, tomorrow, specific date). Summarise check-in/out, transport, activities, and packing tips.
3. Think about the kids (aged 7 and 11). Highlight heat, late nights, long travel, and non-kid-friendly venues. Suggest adjustments.
4. Suggest extra activities and food options (family-friendly, reasonable budget, shorter queues).
5. Use and understand photos we upload. Describe them, answer questions, and suggest memory captions.
6. Help coordinate between adults. Keep answers clear, structured, and phone-friendly.

Answer style:
- Use friendly, practical UK English.
- Use clear headings and bullet points.
- Make times and places bold or on separate lines.
- If information is missing, state what is missing.
- Use Google Search for recent, family-friendly info if needed.
`;
