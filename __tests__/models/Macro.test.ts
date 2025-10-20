import { MacroModel, MacroActionType, macroSchema } from '@/lib/models/Macro';
import { randomUUID } from 'crypto';

describe('Macro Model', () => {
  describe('Schema Validation', () => {
    it('should validate a valid macro', () => {
      const validMacro = {
        id: randomUUID(),
        name: 'Show Open',
        description: 'Opening macro for show',
        actions: [
          {
            type: MacroActionType.LOWER_SHOW,
            params: { title: 'Welcome', subtitle: 'Live Show' },
            delayAfter: 0,
          },
          {
            type: MacroActionType.COUNTDOWN_START,
            params: { seconds: 300 },
            delayAfter: 1000,
          },
        ],
        hotkey: 'F1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = macroSchema.safeParse(validMacro);
      expect(result.success).toBe(true);
    });

    it('should reject macro with empty actions', () => {
      const invalidMacro = {
        id: randomUUID(),
        name: 'Empty Macro',
        actions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = macroSchema.safeParse(invalidMacro);
      expect(result.success).toBe(false);
    });

    it('should default delayAfter to 0', () => {
      const macro = {
        id: randomUUID(),
        name: 'Test Macro',
        actions: [
          {
            type: MacroActionType.LOWER_HIDE,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = macroSchema.parse(macro);
      expect(result.actions[0].delayAfter).toBe(0);
    });
  });

  describe('MacroModel Class', () => {
    it('should create a macro model instance', () => {
      const macroData = {
        id: randomUUID(),
        name: 'Show Open',
        description: 'Opening macro',
        actions: [
          {
            type: MacroActionType.LOWER_SHOW,
            params: {},
            delayAfter: 0,
          },
        ],
        hotkey: 'F1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const macro = new MacroModel(macroData);

      expect(macro.getName()).toBe('Show Open');
      expect(macro.getDescription()).toBe('Opening macro');
      expect(macro.getHotkey()).toBe('F1');
      expect(macro.getActions()).toHaveLength(1);
    });

    it('should calculate estimated duration', () => {
      const macroData = {
        id: randomUUID(),
        name: 'Test Macro',
        actions: [
          { type: MacroActionType.LOWER_SHOW, params: {}, delayAfter: 1000 },
          { type: MacroActionType.DELAY, params: { duration: 2000 }, delayAfter: 0 },
          { type: MacroActionType.LOWER_HIDE, params: {}, delayAfter: 500 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const macro = new MacroModel(macroData);
      expect(macro.getEstimatedDuration()).toBe(1500);
    });

    it('should check if macro belongs to profile', () => {
      const profileId = randomUUID();
      const macroData = {
        id: randomUUID(),
        name: 'Test Macro',
        actions: [{ type: MacroActionType.LOWER_HIDE, params: {}, delayAfter: 0 }],
        profileId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const macro = new MacroModel(macroData);
      expect(macro.belongsToProfile(profileId)).toBe(true);
      expect(macro.belongsToProfile(randomUUID())).toBe(false);
    });
  });
});

