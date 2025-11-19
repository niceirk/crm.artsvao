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
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  firstName?: string;
  resetUrl: string;
}

export const PasswordResetEmail = ({
  firstName = 'Пользователь',
  resetUrl,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Восстановление пароля ArtsVAO</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with gradient */}
          <Section style={header}>
            <Heading style={heading}>ArtsVAO</Heading>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Heading as="h2" style={title}>
              Восстановление пароля
            </Heading>

            <Text style={paragraph}>
              Здравствуйте, {firstName}!
            </Text>

            <Text style={paragraph}>
              Мы получили запрос на восстановление пароля для вашей учетной записи в системе ArtsVAO.
              Если это были не вы, просто проигнорируйте это письмо.
            </Text>

            <Text style={paragraph}>
              Для установки нового пароля нажмите на кнопку ниже:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Восстановить пароль
              </Button>
            </Section>

            {/* Warning box */}
            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ Ссылка действительна в течение 1 часа
              </Text>
            </Section>

            <Text style={paragraph}>
              Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:
            </Text>

            <Text style={link}>
              {resetUrl}
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

export default PasswordResetEmail;

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

const warningBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '5px',
  padding: '15px',
  margin: '20px 0',
};

const warningText = {
  color: '#856404',
  fontSize: '14px',
  margin: '0',
  textAlign: 'center' as const,
};

const link = {
  color: '#667eea',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  marginBottom: '16px',
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
