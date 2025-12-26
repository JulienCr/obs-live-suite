import { LowerThirdAnimationConfig } from "@/lib/models/OverlayEvents";

/**
 * Default animation configuration for Lower Third
 */
export const DEFAULT_LOWER_THIRD_CONFIG: LowerThirdAnimationConfig = {
  timing: {
    logoFadeDuration: 200,
    logoScaleDuration: 200,
    flipDuration: 600,
    flipDelay: 500,
    barAppearDelay: 800,
    barExpandDuration: 450,
    textAppearDelay: 1000,
    textFadeDuration: 250,
  },
  styles: {
    barBorderRadius: 16,
    barMinWidth: 200,
    avatarBorderWidth: 4,
    avatarBorderColor: '#272727',
  },
};

/**
 * Default logo image path
 */
export const DEFAULT_LOGO_IMAGE = '/img/Logo-rond.png';

