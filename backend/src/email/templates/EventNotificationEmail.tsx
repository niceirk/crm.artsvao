import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

type NotificationType = 'new' | 'update' | 'cancel';

interface EventChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface EventNotificationEmailProps {
  notificationType: NotificationType;
  eventTitle: string;
  eventDate: string;
  location?: string;
  organizer?: string;
  capacity?: number;
  description?: string;
  changes?: EventChange[];
  eventUrl: string;
}

export const EventNotificationEmail = ({
  notificationType,
  eventTitle,
  eventDate,
  location,
  organizer,
  capacity,
  description,
  changes = [],
  eventUrl,
}: EventNotificationEmailProps) => {
  const notificationTitles = {
    new: 'Новое мероприятие',
    update: 'Изменение в мероприятии',
    cancel: 'Отмена мероприятия',
  };

  const notificationColors = {
    new: '#28a745',
    update: '#ffc107',
    cancel: '#dc3545',
  };

  return (
    <Html>
      <Head />
      <Preview>{notificationTitles[notificationType]}: {eventTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with gradient */}
          <Section style={header}>
            <Heading style={heading}>ArtsVAO</Heading>
          </Section>

          {/* Main content */}
          <Section style={content}>
            {/* Badge */}
            <Section
              style={{
                ...badge,
                backgroundColor: notificationColors[notificationType],
              }}
            >
              <Text style={badgeText}>
                {notificationTitles[notificationType]}
              </Text>
            </Section>

            <Heading as="h2" style={title}>
              {eventTitle}
            </Heading>

            {notificationType === 'cancel' && (
              <Section style={cancelBox}>
                <Text style={cancelText}>
                  ⚠️ Это мероприятие было отменено
                </Text>
              </Section>
            )}

            {/* Event details */}
            <Section style={detailsBox}>
              <Section style={detailRow}>
                <Text style={detailIcon}>📅</Text>
                <Section>
                  <Text style={detailLabel}>Дата и время</Text>
                  <Text style={detailValue}>{eventDate}</Text>
                </Section>
              </Section>

              {location && (
                <Section style={detailRow}>
                  <Text style={detailIcon}>📍</Text>
                  <Section>
                    <Text style={detailLabel}>Место проведения</Text>
                    <Text style={detailValue}>{location}</Text>
                  </Section>
                </Section>
              )}

              {organizer && (
                <Section style={detailRow}>
                  <Text style={detailIcon}>👤</Text>
                  <Section>
                    <Text style={detailLabel}>Организатор</Text>
                    <Text style={detailValue}>{organizer}</Text>
                  </Section>
                </Section>
              )}

              {capacity && (
                <Section style={detailRow}>
                  <Text style={detailIcon}>👥</Text>
                  <Section>
                    <Text style={detailLabel}>Вместимость</Text>
                    <Text style={detailValue}>{capacity} человек</Text>
                  </Section>
                </Section>
              )}
            </Section>

            {description && (
              <>
                <Text style={sectionTitle}>Описание</Text>
                <Text style={paragraph}>{description}</Text>
              </>
            )}

            {/* Changes list for update type */}
            {notificationType === 'update' && changes.length > 0 && (
              <>
                <Hr style={divider} />
                <Text style={sectionTitle}>Что изменилось:</Text>
                <Section style={changesBox}>
                  {changes.map((change, index) => (
                    <Section key={index} style={changeItem}>
                      <Text style={changeField}>{change.field}:</Text>
                      <Text style={changeValue}>
                        <span style={oldValue}>{change.oldValue}</span>
                        {' → '}
                        <span style={newValue}>{change.newValue}</span>
                      </Text>
                    </Section>
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
            <Text style={footerText}>
              С уважением,
              <br />
              Команда ArtsVAO
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} ArtsVAO. Все права защищены.
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
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '30px 40px',
  textAlign: 'center' as const,
};

const heading = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const content = {
  padding: '40px',
};

const badge = {
  display: 'inline-block',
  padding: '6px 12px',
  borderRadius: '4px',
  marginBottom: '20px',
};

const badgeText = {
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '0',
};

const title = {
  color: '#333333',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const cancelBox = {
  backgroundColor: '#f8d7da',
  border: '1px solid #dc3545',
  borderRadius: '5px',
  padding: '15px',
  margin: '20px 0',
};

const cancelText = {
  color: '#721c24',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const detailsBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
};

const detailRow = {
  display: 'flex',
  marginBottom: '16px',
};

const detailIcon = {
  fontSize: '24px',
  marginRight: '12px',
  minWidth: '32px',
};

const detailLabel = {
  color: '#666666',
  fontSize: '14px',
  margin: '0 0 4px 0',
};

const detailValue = {
  color: '#333333',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0',
};

const sectionTitle = {
  color: '#333333',
  fontSize: '18px',
  fontWeight: 'bold',
  marginTop: '20px',
  marginBottom: '12px',
};

const paragraph = {
  color: '#555555',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const divider = {
  borderColor: '#e0e0e0',
  margin: '30px 0',
};

const changesBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '5px',
  padding: '15px',
  margin: '10px 0 20px 0',
};

const changeItem = {
  marginBottom: '12px',
};

const changeField = {
  color: '#856404',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
};

const changeValue = {
  color: '#856404',
  fontSize: '14px',
  margin: '0',
};

const oldValue = {
  textDecoration: 'line-through',
  opacity: 0.7,
};

const newValue = {
  fontWeight: 'bold',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#667eea',
  borderRadius: '5px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

const footer = {
  borderTop: '1px solid #e0e0e0',
  padding: '30px 40px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#999999',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 10px 0',
};
