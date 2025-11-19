import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface EventNotificationEmailProps {
  notificationType: 'new' | 'update' | 'cancel';
  eventTitle: string;
  eventDate: string;
  location?: string;
  organizer?: string;
  capacity?: number;
  description?: string;
  changes?: string[];
  eventUrl: string;
}

const notificationTitles = {
  new: 'Новое мероприятие',
  update: 'Изменение в мероприятии',
  cancel: 'Отмена мероприятия',
};

export const EventNotificationEmail = ({
  notificationType,
  eventTitle,
  eventDate,
  location,
  organizer,
  capacity,
  description,
  changes,
  eventUrl,
}: EventNotificationEmailProps) => {
  const title = notificationTitles[notificationType];

  return (
    <Html>
      <Head />
      <Preview>{title}: {eventTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>артсвао</Heading>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Heading as="h2" style={titleStyle}>
              {title}
            </Heading>

            <Text style={paragraph}>
              Здравствуйте!
            </Text>

            {notificationType === 'new' && (
              <Text style={paragraph}>
                Мы рады сообщить вам о новом мероприятии.
              </Text>
            )}

            {notificationType === 'update' && (
              <Text style={paragraph}>
                В мероприятии произошли изменения.
              </Text>
            )}

            {notificationType === 'cancel' && (
              <Text style={paragraph}>
                К сожалению, мероприятие было отменено.
              </Text>
            )}

            {/* Event Info Box */}
            <Section style={eventBox}>
              <Text style={eventTitle}>{eventTitle}</Text>
              
              <Hr style={divider} />
              
              {eventDate && (
                <div style={eventDetail}>
                  <Text style={eventLabel}>Дата и время:</Text>
                  <Text style={eventValue}>{eventDate}</Text>
                </div>
              )}
              
              {location && (
                <div style={eventDetail}>
                  <Text style={eventLabel}>Место:</Text>
                  <Text style={eventValue}>{location}</Text>
                </div>
              )}
              
              {organizer && (
                <div style={eventDetail}>
                  <Text style={eventLabel}>Организатор:</Text>
                  <Text style={eventValue}>{organizer}</Text>
                </div>
              )}
              
              {capacity && (
                <div style={eventDetail}>
                  <Text style={eventLabel}>Мест:</Text>
                  <Text style={eventValue}>{capacity}</Text>
                </div>
              )}
            </Section>

            {description && (
              <>
                <Text style={sectionTitle}>Описание:</Text>
                <Text style={paragraph}>{description}</Text>
              </>
            )}

            {changes && changes.length > 0 && (
              <>
                <Text style={sectionTitle}>Изменения:</Text>
                <Section style={changesBox}>
                  {changes.map((change, index) => (
                    <Text key={index} style={changeItem}>
                      • {change}
                    </Text>
                  ))}
                </Section>
              </>
            )}

            {notificationType !== 'cancel' && (
              <Section style={buttonContainer}>
                <Button style={button} href={eventUrl}>
                  Подробнее о мероприятии
                </Button>
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              С уважением,
              <br />
              Команда артсвао
            </Text>
            <Text style={footerCopyright}>
              © {new Date().getFullYear()} артсвао. Все права защищены.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EventNotificationEmail;

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  border: '1px solid #e5e5e5',
};

const header = {
  backgroundColor: '#000000',
  padding: '32px 40px',
  textAlign: 'center' as const,
};

const logo = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '600',
  margin: '0',
  padding: '0',
  letterSpacing: '0.5px',
};

const content = {
  padding: '40px',
};

const titleStyle = {
  color: '#000000',
  fontSize: '24px',
  fontWeight: '600',
  marginBottom: '24px',
  marginTop: '0',
};

const paragraph = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const sectionTitle = {
  color: '#000000',
  fontSize: '16px',
  fontWeight: '600',
  margin: '24px 0 12px 0',
};

const eventBox = {
  border: '1px solid #e5e5e5',
  borderRadius: '4px',
  padding: '24px',
  margin: '24px 0',
  backgroundColor: '#fafafa',
};

const eventTitle = {
  color: '#000000',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const eventDetail = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '12px',
};

const eventLabel = {
  color: '#737373',
  fontSize: '14px',
  margin: '0',
  fontWeight: '500',
  flex: '0 0 auto',
};

const eventValue = {
  color: '#000000',
  fontSize: '14px',
  margin: '0',
  fontWeight: '600',
  textAlign: 'right' as const,
  flex: '1',
};

const divider = {
  borderColor: '#e5e5e5',
  margin: '16px 0',
};

const changesBox = {
  border: '1px solid #e5e5e5',
  borderRadius: '4px',
  padding: '16px 20px',
  margin: '12px 0 24px 0',
  backgroundColor: '#fafafa',
};

const changeItem = {
  color: '#404040',
  fontSize: '14px',
  margin: '6px 0',
  lineHeight: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const footer = {
  padding: '0 40px 40px 40px',
};

const footerDivider = {
  borderColor: '#e5e5e5',
  margin: '0 0 24px 0',
};

const footerText = {
  color: '#737373',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};

const footerCopyright = {
  color: '#a3a3a3',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
  textAlign: 'center' as const,
};
