import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Расписание - Культурный центр',
  description: 'Расписание студий и мероприятий культурного центра',
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
