import { GuestModel, guestSchema, createGuestSchema } from '@/lib/models/Guest';
import { randomUUID } from 'crypto';

describe('Guest Model', () => {
  describe('Schema Validation', () => {
    it('should validate a valid guest', () => {
      const validGuest = {
        id: randomUUID(),
        displayName: 'John Doe',
        subtitle: 'Host',
        accentColor: '#3b82f6',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = guestSchema.safeParse(validGuest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid hex color', () => {
      const invalidGuest = {
        id: randomUUID(),
        displayName: 'John Doe',
        accentColor: 'not-a-color',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = guestSchema.safeParse(invalidGuest);
      expect(result.success).toBe(false);
    });

    it('should use default accent color', () => {
      const guest = {
        id: randomUUID(),
        displayName: 'John Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = guestSchema.parse(guest);
      expect(result.accentColor).toBe('#3b82f6');
    });

    it('should reject empty display name', () => {
      const invalidGuest = {
        id: randomUUID(),
        displayName: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = guestSchema.safeParse(invalidGuest);
      expect(result.success).toBe(false);
    });
  });

  describe('GuestModel Class', () => {
    it('should create a guest model instance', () => {
      const guestData = {
        id: randomUUID(),
        displayName: 'John Doe',
        subtitle: 'Host',
        accentColor: '#3b82f6',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const guest = new GuestModel(guestData);

      expect(guest.getId()).toBe(guestData.id);
      expect(guest.getDisplayName()).toBe('John Doe');
      expect(guest.getSubtitle()).toBe('Host');
      expect(guest.getAccentColor()).toBe('#3b82f6');
    });

    it('should update guest data', () => {
      const guestData = {
        id: randomUUID(),
        displayName: 'John Doe',
        accentColor: '#3b82f6',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const guest = new GuestModel(guestData);
      guest.update({ displayName: 'Jane Doe', subtitle: 'Co-Host' });

      expect(guest.getDisplayName()).toBe('Jane Doe');
      expect(guest.getSubtitle()).toBe('Co-Host');
    });

    it('should convert to JSON', () => {
      const guestData = {
        id: randomUUID(),
        displayName: 'John Doe',
        accentColor: '#3b82f6',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const guest = new GuestModel(guestData);
      const json = guest.toJSON();

      expect(json).toEqual({
        ...guestData,
        subtitle: null,
        avatarUrl: null,
        chatMessage: null,
        isEnabled: true,
      });
    });

    it('should create from JSON', () => {
      const guestData = {
        id: randomUUID(),
        displayName: 'John Doe',
        accentColor: '#3b82f6',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const guest = GuestModel.fromJSON(guestData);

      expect(guest.getDisplayName()).toBe('John Doe');
    });
  });

  describe('Create Guest Schema', () => {
    it('should create guest without id and timestamps', () => {
      const createData = {
        displayName: 'John Doe',
        subtitle: 'Host',
        accentColor: '#3b82f6',
      };

      const result = createGuestSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });
  });
});

