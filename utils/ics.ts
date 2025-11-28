export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  location?: string;
}

export const generateICS = (events: CalendarEvent[]) => {
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, '');
  };

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PetLife PWA//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach(event => {
    const cleanDate = formatDate(event.startDate);
    
    // Create Alarms (7 days, 3 days, 1 day before)
    const alarms = [7, 3, 1].map(days => `
BEGIN:VALARM
TRIGGER:-P${days}D
ACTION:DISPLAY
DESCRIPTION:Lembrete PetLife: ${event.title} (${days} dias antes)
END:VALARM`.trim()).join('\n');

    const vEvent = [
      'BEGIN:VEVENT',
      `UID:${event.id}@petlife.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${cleanDate}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:PetLife App`,
      `STATUS:CONFIRMED`,
      alarms,
      'END:VEVENT'
    ].join('\n');

    icsContent.push(vEvent);
  });

  icsContent.push('END:VCALENDAR');

  return icsContent.join('\n');
};

export const downloadICS = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};