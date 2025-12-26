"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ColorScheme, LowerThirdAnimationTheme } from "@/lib/models/Theme";
import { Card } from "@/components/ui/card";

interface LowerThirdAnimationEditorProps {
  value: LowerThirdAnimationTheme;
  themeColors: ColorScheme;
  onChange: (value: LowerThirdAnimationTheme) => void;
}

export function LowerThirdAnimationEditor({
  value,
  themeColors,
  onChange,
}: LowerThirdAnimationEditorProps) {
  const handleTimingChange = (key: keyof LowerThirdAnimationTheme['timing'], val: number) => {
    onChange({
      ...value,
      timing: {
        ...value.timing,
        [key]: val,
      },
    });
  };

  const handleStyleChange = (key: keyof LowerThirdAnimationTheme['styles'], val: number | string) => {
    onChange({
      ...value,
      styles: {
        ...value.styles,
        [key]: val,
      },
    });
  };

  const handleColorChange = (key: 'titleColor' | 'subtitleColor' | 'barBgColor', val: string) => {
    onChange({
      ...value,
      colors: {
        ...value.colors,
        [key]: val || undefined,
      },
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Timings (ms)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="logoFadeDuration" className="text-xs">Logo Fade</Label>
            <Input
              id="logoFadeDuration"
              type="number"
              min="0"
              max="2000"
              step="50"
              value={value.timing.logoFadeDuration}
              onChange={(e) => handleTimingChange('logoFadeDuration', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="logoScaleDuration" className="text-xs">Logo Scale</Label>
            <Input
              id="logoScaleDuration"
              type="number"
              min="0"
              max="2000"
              step="50"
              value={value.timing.logoScaleDuration}
              onChange={(e) => handleTimingChange('logoScaleDuration', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="flipDelay" className="text-xs">Flip Delay</Label>
            <Input
              id="flipDelay"
              type="number"
              min="0"
              max="5000"
              step="50"
              value={value.timing.flipDelay}
              onChange={(e) => handleTimingChange('flipDelay', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="flipDuration" className="text-xs">Flip Duration</Label>
            <Input
              id="flipDuration"
              type="number"
              min="0"
              max="2000"
              step="50"
              value={value.timing.flipDuration}
              onChange={(e) => handleTimingChange('flipDuration', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="barAppearDelay" className="text-xs">Bar Appear Delay</Label>
            <Input
              id="barAppearDelay"
              type="number"
              min="0"
              max="5000"
              step="50"
              value={value.timing.barAppearDelay}
              onChange={(e) => handleTimingChange('barAppearDelay', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="barExpandDuration" className="text-xs">Bar Expand Duration</Label>
            <Input
              id="barExpandDuration"
              type="number"
              min="0"
              max="2000"
              step="50"
              value={value.timing.barExpandDuration}
              onChange={(e) => handleTimingChange('barExpandDuration', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="textAppearDelay" className="text-xs">Text Appear Delay</Label>
            <Input
              id="textAppearDelay"
              type="number"
              min="0"
              max="5000"
              step="50"
              value={value.timing.textAppearDelay}
              onChange={(e) => handleTimingChange('textAppearDelay', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="textFadeDuration" className="text-xs">Text Fade Duration</Label>
            <Input
              id="textFadeDuration"
              type="number"
              min="0"
              max="2000"
              step="50"
              value={value.timing.textFadeDuration}
              onChange={(e) => handleTimingChange('textFadeDuration', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Styles</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="barBorderRadius" className="text-xs">Bar Border Radius (px)</Label>
            <Input
              id="barBorderRadius"
              type="number"
              min="0"
              max="50"
              value={value.styles.barBorderRadius}
              onChange={(e) => handleStyleChange('barBorderRadius', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="barMinWidth" className="text-xs">Bar Min Width (px)</Label>
            <Input
              id="barMinWidth"
              type="number"
              min="0"
              max="1000"
              value={value.styles.barMinWidth}
              onChange={(e) => handleStyleChange('barMinWidth', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="avatarBorderWidth" className="text-xs">Avatar Border (px)</Label>
            <Input
              id="avatarBorderWidth"
              type="number"
              min="0"
              max="20"
              value={value.styles.avatarBorderWidth}
              onChange={(e) => handleStyleChange('avatarBorderWidth', parseInt(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="avatarBorderColor" className="text-xs">Avatar Border Color</Label>
            <div className="flex gap-2">
              <Input
                id="avatarBorderColor"
                type="color"
                value={value.styles.avatarBorderColor}
                onChange={(e) => handleStyleChange('avatarBorderColor', e.target.value)}
                className="h-8 w-16 p-1"
              />
              <Input
                type="text"
                value={value.styles.avatarBorderColor}
                onChange={(e) => handleStyleChange('avatarBorderColor', e.target.value)}
                className="h-8 flex-1 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Color Overrides (optional)</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Leave empty to use theme colors
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label htmlFor="titleColor" className="text-xs">
              Title Color <span className="text-muted-foreground">(default: {themeColors.text})</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="titleColor"
                type="color"
                value={value.colors?.titleColor || themeColors.text}
                onChange={(e) => handleColorChange('titleColor', e.target.value)}
                className="h-8 w-16 p-1"
              />
              <Input
                type="text"
                placeholder="Use theme color"
                value={value.colors?.titleColor || ''}
                onChange={(e) => handleColorChange('titleColor', e.target.value)}
                className="h-8 flex-1 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="subtitleColor" className="text-xs">
              Subtitle Color <span className="text-muted-foreground">(default: {themeColors.text}BF)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="subtitleColor"
                type="color"
                value={value.colors?.subtitleColor || themeColors.text}
                onChange={(e) => handleColorChange('subtitleColor', e.target.value)}
                className="h-8 w-16 p-1"
              />
              <Input
                type="text"
                placeholder="Use theme color"
                value={value.colors?.subtitleColor || ''}
                onChange={(e) => handleColorChange('subtitleColor', e.target.value)}
                className="h-8 flex-1 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="barBgColor" className="text-xs">
              Bar Background <span className="text-muted-foreground">(default: {themeColors.surface})</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="barBgColor"
                type="color"
                value={value.colors?.barBgColor || themeColors.surface}
                onChange={(e) => handleColorChange('barBgColor', e.target.value)}
                className="h-8 w-16 p-1"
              />
              <Input
                type="text"
                placeholder="Use theme color"
                value={value.colors?.barBgColor || ''}
                onChange={(e) => handleColorChange('barBgColor', e.target.value)}
                className="h-8 flex-1 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

