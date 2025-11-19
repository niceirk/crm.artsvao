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

interface UserInviteEmailProps {
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  inviterName: string;
  inviteUrl: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  USER: 'Пользователь',
};

export const UserInviteEmail = ({
  firstName,
  lastName,
  email,
  role,
  inviterName,
  inviteUrl,
}: UserInviteEmailProps) => {
  const userName = firstName && lastName ? `${firstName} ${lastName}` : firstName || 'Пользователь';
  const roleLabel = roleLabels[role] || role;

  return (
    <Html>
      <Head />
      <Preview>Приглашение в систему артсвао</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>артсвао</Heading>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Heading as="h2" style={title}>
              Приглашение в систему
            </Heading>

            <Text style={paragraph}>
              Здравствуйте, {userName}!
            </Text>

            <Text style={paragraph}>
              {inviterName} приглашает вас присоединиться к системе управления артсвао.
            </Text>

            {/* Info Box */}
            <Section style={infoBox}>
              <div style={infoRow}>
                <Text style={infoLabel}>Email:</Text>
                <Text style={infoValue}>{email}</Text>
              </div>
              <Hr style={divider} />
              <div style={infoRow}>
                <Text style={infoLabel}>Роль:</Text>
                <Text style={infoValue}>{roleLabel}</Text>
              </div>
            </Section>

            <Text style={paragraph}>
              Для завершения регистрации и установки пароля нажмите на кнопку ниже:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={inviteUrl}>
                Установить пароль
              </Button>
            </Section>

            <Text style={paragraph}>
              Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:
            </Text>

            <Text style={link}>
              {inviteUrl}
            </Text>
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

export default UserInviteEmail;

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

const title = {
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

const infoBox = {
  border: '1px solid #e5e5e5',
  borderRadius: '4px',
  padding: '24px',
  margin: '24px 0',
  backgroundColor: '#fafafa',
};

const infoRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const infoLabel = {
  color: '#737373',
  fontSize: '14px',
  margin: '0',
  fontWeight: '500',
};

const infoValue = {
  color: '#000000',
  fontSize: '14px',
  margin: '0',
  fontWeight: '600',
};

const divider = {
  borderColor: '#e5e5e5',
  margin: '16px 0',
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

const link = {
  color: '#404040',
  fontSize: '13px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  marginBottom: '16px',
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
