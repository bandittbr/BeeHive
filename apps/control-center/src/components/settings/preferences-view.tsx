import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  LayoutSection,
  LayoutSectionDescription,
  LayoutSectionHeader,
  LayoutSectionItem,
  LayoutSectionItemDescription,
  LayoutSectionItemHeader,
  LayoutSectionItemHeaderActions,
  LayoutSectionItemTitle,
  LayoutSectionTitle,
  LayoutStack,
} from "./settings-layout";

export function PreferencesView() {
  const [showThinking, setShowThinking] = useState(false);
  const [autoCompactContext, setAutoCompactContext] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  return (
    <LayoutStack>
      <LayoutSection>
        <LayoutSectionHeader>
          <LayoutSectionTitle>Model</LayoutSectionTitle>
          <LayoutSectionDescription>Configure how AI models behave</LayoutSectionDescription>
        </LayoutSectionHeader>

        <LayoutSectionItem>
          <LayoutSectionItemHeader>
            <LayoutSectionItemTitle>Show model reasoning</LayoutSectionItemTitle>
            <LayoutSectionItemDescription>Display the model's thinking process before responses</LayoutSectionItemDescription>
            <LayoutSectionItemHeaderActions>
              <Switch
                aria-label="Show model reasoning"
                checked={showThinking}
                onCheckedChange={() => setShowThinking(!showThinking)}
              />
            </LayoutSectionItemHeaderActions>
          </LayoutSectionItemHeader>
        </LayoutSectionItem>

        <LayoutSectionItem>
          <LayoutSectionItemHeader>
            <LayoutSectionItemTitle>Auto-compact context</LayoutSectionItemTitle>
            <LayoutSectionItemDescription>Automatically compress context when approaching token limits</LayoutSectionItemDescription>
            <LayoutSectionItemHeaderActions>
              <Switch
                aria-label="Auto-compact context"
                checked={autoCompactContext}
                onCheckedChange={() => setAutoCompactContext(!autoCompactContext)}
              />
            </LayoutSectionItemHeaderActions>
          </LayoutSectionItemHeader>
        </LayoutSectionItem>
      </LayoutSection>

      <LayoutSection>
        <LayoutSectionHeader>
          <LayoutSectionTitle>Privacy</LayoutSectionTitle>
          <LayoutSectionDescription>Control data collection and analytics</LayoutSectionDescription>
        </LayoutSectionHeader>

        <LayoutSectionItem>
          <LayoutSectionItemHeader>
            <LayoutSectionItemTitle>Usage analytics</LayoutSectionItemTitle>
            <LayoutSectionItemDescription>Help improve BeeHive by sharing anonymous usage data</LayoutSectionItemDescription>
            <LayoutSectionItemHeaderActions>
              <Switch
                aria-label="Usage analytics"
                checked={analyticsEnabled}
                onCheckedChange={() => setAnalyticsEnabled(!analyticsEnabled)}
              />
            </LayoutSectionItemHeaderActions>
          </LayoutSectionItemHeader>
        </LayoutSectionItem>
      </LayoutSection>
    </LayoutStack>
  );
}
