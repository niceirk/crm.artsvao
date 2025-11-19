import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface InvoiceQRCodeEmailProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  qrCodeDataUrl: string;
  paymentPurpose?: string;
  discountAmount?: number;
  discountPercent?: number;
}

export const InvoiceQRCodeEmail = ({
  clientName,
  invoiceNumber,
  amount,
  qrCodeDataUrl,
  paymentPurpose,
  discountAmount,
  discountPercent,
}: InvoiceQRCodeEmailProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(value);
  };

  return (
    <Html>
      <Head />
      <Preview>QR-код для оплаты счета {invoiceNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>артсвао</Heading>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Heading as="h2" style={title}>
              QR-код для оплаты счета
            </Heading>

            <Text style={paragraph}>
              Здравствуйте, {clientName}!
            </Text>

            <Text style={paragraph}>
              Для вашего удобства мы подготовили QR-код для оплаты счета.
            </Text>

            {/* Invoice Info Box */}
            <Section style={infoBox}>
              <div style={infoRow}>
                <Text style={infoLabel}>Номер счета:</Text>
                <Text style={infoValue}>{invoiceNumber}</Text>
              </div>
              <Hr style={divider} />
              <div style={infoRow}>
                <Text style={infoLabel}>Скидка{discountPercent && discountPercent > 0 ? ` (${discountPercent}%)` : ''}:</Text>
                <Text style={discountAmount && discountAmount > 0 ? infoValueDiscount : infoValue}>
                  {discountAmount && discountAmount > 0 ? `−${formatCurrency(discountAmount)}` : '—'}
                </Text>
              </div>
              <Hr style={divider} />
              <div style={infoRow}>
                <Text style={infoLabel}>Сумма к оплате:</Text>
                <Text style={infoValueAmount}>{formatCurrency(amount)}</Text>
              </div>
            </Section>

            {/* Payment Purpose */}
            {paymentPurpose && (
              <Section style={purposeBox}>
                <Text style={purposeTitle}>Назначение платежа:</Text>
                <Text style={purposeText}>{paymentPurpose}</Text>
              </Section>
            )}

            {/* QR Code */}
            <Section style={qrSection}>
              <Text style={qrTitle}>Отсканируйте QR-код для оплаты:</Text>
              <Img
                src={qrCodeDataUrl}
                alt="QR-код для оплаты"
                style={qrImage}
              />
            </Section>

            {/* Instructions */}
            <Section style={instructionsBox}>
              <Text style={instructionsTitle}>
                Как оплатить:
              </Text>
              <Text style={instructionItem}>
                1. Откройте мобильное приложение вашего банка
              </Text>
              <Text style={instructionItem}>
                2. Выберите "Оплата по QR-коду"
              </Text>
              <Text style={instructionItem}>
                3. Наведите камеру на QR-код
              </Text>
              <Text style={instructionItem}>
                4. Проверьте данные и подтвердите платеж
              </Text>
            </Section>

            <Text style={paragraph}>
              Если у вас возникли вопросы, свяжитесь с нами любым удобным способом.
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

export default InvoiceQRCodeEmail;

// Styles - минималистичный черно-белый дизайн артсвао
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const infoValueAmount = {
  color: '#000000',
  fontSize: '18px',
  margin: '0',
  fontWeight: '700',
};

const infoValueDiscount = {
  color: '#16a34a',
  fontSize: '14px',
  margin: '0',
  fontWeight: '600',
};

const purposeBox = {
  border: '1px solid #e5e5e5',
  borderRadius: '4px',
  padding: '16px 20px',
  margin: '16px 0 24px 0',
  backgroundColor: '#fafafa',
};

const purposeTitle = {
  color: '#000000',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const purposeText = {
  color: '#404040',
  fontSize: '13px',
  lineHeight: '18px',
  margin: '0',
};

const divider = {
  borderColor: '#e5e5e5',
  margin: '16px 0',
};

const qrSection = {
  textAlign: 'center' as const,
  padding: '32px 0',
};

const qrTitle = {
  color: '#000000',
  fontSize: '16px',
  fontWeight: '600',
  marginBottom: '20px',
};

const qrImage = {
  width: '280px',
  height: '280px',
  margin: '0 auto',
  display: 'block',
  border: '1px solid #e5e5e5',
  borderRadius: '4px',
  padding: '16px',
  backgroundColor: '#ffffff',
};

const instructionsBox = {
  border: '1px solid #e5e5e5',
  borderRadius: '4px',
  padding: '20px 24px',
  margin: '24px 0',
  backgroundColor: '#fafafa',
};

const instructionsTitle = {
  color: '#000000',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const instructionItem = {
  color: '#404040',
  fontSize: '14px',
  margin: '6px 0',
  lineHeight: '20px',
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
