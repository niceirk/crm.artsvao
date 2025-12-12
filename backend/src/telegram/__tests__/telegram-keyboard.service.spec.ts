import { Test, TestingModule } from '@nestjs/testing';
import { TelegramKeyboardService } from '../services/telegram-keyboard.service';
import { ClientSelectionInfo, ParticipantOption } from '../interfaces/state-context.interface';

describe('TelegramKeyboardService', () => {
  let service: TelegramKeyboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramKeyboardService],
    }).compile();

    service = module.get<TelegramKeyboardService>(TelegramKeyboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildContactRequestKeyboard', () => {
    it('should return keyboard with contact request button', () => {
      const keyboard = service.buildContactRequestKeyboard();

      expect(keyboard).toBeDefined();
      expect(keyboard.keyboard).toHaveLength(2);
      expect(keyboard.keyboard[0][0].request_contact).toBe(true);
      expect(keyboard.resize_keyboard).toBe(true);
      expect(keyboard.one_time_keyboard).toBe(true);
    });
  });

  describe('buildClientSelectionKeyboard', () => {
    it('should create buttons for each client plus skip button', () => {
      const clients: ClientSelectionInfo[] = [
        {
          id: 'client-1',
          firstName: 'Иван',
          lastName: 'Иванов',
          middleName: 'Иванович',
          dateOfBirth: new Date('1990-01-15'),
        },
        {
          id: 'client-2',
          firstName: 'Петр',
          lastName: 'Петров',
          middleName: null,
          dateOfBirth: null,
        },
      ];

      const keyboard = service.buildClientSelectionKeyboard(clients);

      expect(keyboard).toHaveLength(3); // 2 clients + 1 skip button
      expect(keyboard[0][0].callback_data).toBe('select_client_client-1');
      expect(keyboard[0][0].text).toContain('Иванов Иван Иванович');
      expect(keyboard[0][0].text).toContain('1990 г.р.');
      expect(keyboard[1][0].callback_data).toBe('select_client_client-2');
      expect(keyboard[2][0].callback_data).toBe('skip_identification');
    });
  });

  describe('buildWelcomeKeyboard', () => {
    it('should return keyboard with identification and question buttons', () => {
      const keyboard = service.buildWelcomeKeyboard();

      expect(keyboard).toHaveLength(2);
      expect(keyboard[0][0].callback_data).toBe('start_identification');
      expect(keyboard[1][0].callback_data).toBe('ask_question');
    });
  });

  describe('buildEventParticipantKeyboard', () => {
    it('should create buttons for each participant plus new and cancel', () => {
      const participants: ParticipantOption[] = [
        { id: 'p1', name: 'Иванов Иван', birthYear: 1990, label: 'вы' },
        { id: 'p2', name: 'Иванов Петр', birthYear: 2015, label: 'ребенок' },
      ];

      const keyboard = service.buildEventParticipantKeyboard(participants);

      expect(keyboard).toHaveLength(4); // 2 participants + new + cancel
      expect(keyboard[0][0].callback_data).toBe('sel_part_p1');
      expect(keyboard[0][0].text).toContain('вы');
      expect(keyboard[1][0].callback_data).toBe('sel_part_p2');
      expect(keyboard[1][0].text).toContain('ребенок');
      expect(keyboard[2][0].callback_data).toBe('new_participant');
      expect(keyboard[3][0].callback_data).toBe('cancel_event_reg');
    });
  });

  describe('escapeHtml', () => {
    it('should escape special HTML characters', () => {
      const text = 'Hello <script> & "test"';
      const escaped = service.escapeHtml(text);

      expect(escaped).toBe('Hello &lt;script&gt; &amp; &quot;test&quot;');
    });
  });

  describe('formatDate', () => {
    it('should format date in Russian locale', () => {
      const date = new Date('2024-03-15');
      const formatted = service.formatDate(date);

      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });

  describe('formatTime', () => {
    it('should return time in HH:MM format', () => {
      const date = new Date('2024-03-15T14:30:00Z');
      const formatted = service.formatTime(date);

      expect(formatted).toBe('14:30');
    });
  });
});
