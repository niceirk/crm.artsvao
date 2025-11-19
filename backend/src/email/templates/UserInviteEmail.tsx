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

interface UserInviteEmailProps {
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  inviterName: string;
  inviteUrl: string;
}

export const UserInviteEmail = ({
  firstName,
  lastName,
  email,
  role,
  inviterName,
  inviteUrl,
}: UserInviteEmailProps) => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || email;

  const roleNames: Record<string, string> = {
    ADMIN: 'Администратор',
    MANAGER: 'Менеджер',
    EMPLOYEE: 'Сотрудник',
    USER: 'Пользователь',
  };

  return (
    <Html>
      <Head />
      <Preview>Приглашение в систему ArtsVAO</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with gradient */}
          <Section style={header}>
            <Heading style={heading}>ArtsVAO</Heading>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Heading as="h2" style={title}>
              Добро пожаловать в ArtsVAO!
            </Heading>

            <Text style={paragraph}>
              Здравствуйте, {fullName}!
            </Text>

            <Text style={paragraph}>
              {inviterName} пригласил вас присоединиться к системе управления ArtsVAO.
              Вы были добавлены с ролью <strong>{roleNames[role] || role}</strong>.
            </Text>

            {/* Info box */}
            <Section style={infoBox}>
              <Text style={infoLabel}>Email:</Text>
              <Text style={infoValue}>{email}</Text>

              <Text style={infoLabel}>Роль:</Text>
              <Text style={infoValue}>{roleNames[role] || role}</Text>
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

            <Hr style={divider} />

            <Text style={noteText}>
              <strong>Примечание:</strong> Ссылка приглашения действительна ограниченное время.
              Если ссылка истекла, обратитесь к администратору для повторной отправки приглашения.
            </Text>
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

export default UserInviteEmail;

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

const title = {
  color: '#333333',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const paragraph = {
  color: '#555555',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e0e0e0',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
};

const infoLabel = {
  color: '#666666',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '8px 0 4px 0',
};

const infoValue = {
  color: '#333333',
  fontSize: '16px',
  margin: '0 0 12px 0',
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

const link = {
  color: '#667eea',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  marginBottom: '16px',
};

const divider = {
  borderColor: '#e0e0e0',
  margin: '30px 0',
};

const noteText = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '20px',
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
