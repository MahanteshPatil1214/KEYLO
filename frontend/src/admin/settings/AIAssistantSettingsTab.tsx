import { useState } from "react";
import {
  Bot,
  Globe,
  Save,
} from "lucide-react";
import type {
  AIAssistantSettings,
  LanguageItem,
  LanguageSettings,
  UpdateAIAssistantSettingsPayload,
  UpdateLanguageSettingsPayload,
} from "../settingsModel";

type AIAssistantSettingsTabProps = {
  aiSettings: AIAssistantSettings;
  langSettings: LanguageSettings;
  onUpdateAI: (payload: UpdateAIAssistantSettingsPayload) => Promise<void>;
  onUpdateLanguages: (payload: UpdateLanguageSettingsPayload) => Promise<void>;
  isSaving: boolean;
};

export function AIAssistantSettingsTab({
  aiSettings,
  langSettings,
  onUpdateAI,
  onUpdateLanguages,
  isSaving,
}: AIAssistantSettingsTabProps) {
  // AI Settings state
  const [groundingMode, setGroundingMode] = useState(aiSettings.grounding_mode);
  const [temperature, setTemperature] = useState(aiSettings.default_temperature);
  const [maxTokens, setMaxTokens] = useState(aiSettings.max_response_tokens);
  const [autoDetect, setAutoDetect] = useState(aiSettings.multilingual_auto_detect);
  const [fallbackReply, setFallbackReply] = useState(aiSettings.fallback_reply);
  const [unconfiguredReply, setUnconfiguredReply] = useState(aiSettings.unconfigured_project_reply);

  // Languages state
  const [languages, setLanguages] = useState<LanguageItem[]>(langSettings.languages);

  const toggleLanguageEnabled = (code: string) => {
    setLanguages((prev) =>
      prev.map((l) => (l.code === code ? { ...l, is_enabled: !l.is_enabled } : l)),
    );
  };

  const setDefaultLanguage = (code: string) => {
    setLanguages((prev) =>
      prev.map((l) => ({
        ...l,
        is_default: l.code === code,
        is_enabled: l.code === code ? true : l.is_enabled,
      })),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await Promise.all([
      onUpdateAI({
        grounding_mode: groundingMode,
        default_temperature: Number(temperature),
        max_response_tokens: Number(maxTokens),
        multilingual_auto_detect: autoDetect,
        fallback_reply: fallbackReply.trim(),
        unconfigured_project_reply: unconfiguredReply.trim(),
      }),
      onUpdateLanguages({
        languages,
      }),
    ]);
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* AI Grounding & Strictness */}
      <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-charcoal/10 pb-3">
          <Bot className="size-4 text-charcoal" />
          <h3 className="font-serif text-base font-bold text-charcoal">
            AI Assistant Grounding & Generation Parameters
          </h3>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Grounding Mode */}
          <div>
            <label className="text-xs font-semibold text-charcoal/70 block mb-2">
              Approved Fact Sheet Grounding Mode
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-3 rounded-xl border border-charcoal/15 bg-white p-3 cursor-pointer hover:border-charcoal/30">
                <input
                  type="radio"
                  name="grounding_mode"
                  checked={groundingMode === "STRICT_FACTS_ONLY"}
                  onChange={() => setGroundingMode("STRICT_FACTS_ONLY")}
                  className="mt-0.5 size-4 text-charcoal focus:ring-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-charcoal block">Strict Facts Only (Zero Speculation)</span>
                  <span className="text-charcoal/60 mt-0.5 block">
                    Restricts responses strictly to verified project fact sheets. Refuses to guess unverified amenities, pricing, or dates.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-charcoal/15 bg-white p-3 cursor-pointer hover:border-charcoal/30">
                <input
                  type="radio"
                  name="grounding_mode"
                  checked={groundingMode === "BALANCED"}
                  onChange={() => setGroundingMode("BALANCED")}
                  className="mt-0.5 size-4 text-charcoal focus:ring-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-charcoal block">Balanced Advisory</span>
                  <span className="text-charcoal/60 mt-0.5 block">
                    Answers grounded strictly in facts while providing warmer conversational transitions and developer overview context.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Model Parameters */}
          <div className="flex flex-col gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between">
                <label className="font-semibold text-charcoal/70">
                  Temperature ({temperature})
                </label>
                <span className="text-[10px] text-charcoal/50">
                  {temperature <= 0.2 ? "Precise & Deterministic" : "More Creative"}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.8"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="mt-2 w-full accent-charcoal"
              />
            </div>

            <div>
              <label className="font-semibold text-charcoal/70 block mb-1">
                Max Response Tokens
              </label>
              <input
                type="number"
                min="200"
                max="1200"
                step="50"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-semibold text-charcoal focus:border-charcoal focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="auto-detect-language"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="size-4 rounded border-charcoal/20 text-charcoal focus:ring-0"
              />
              <label htmlFor="auto-detect-language" className="font-semibold text-charcoal cursor-pointer">
                Automatic Buyer Language Detection & Matching
              </label>
            </div>
          </div>
        </div>

        {/* Custom Fallback Replies */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 border-t border-charcoal/10 pt-4 text-xs">
          <div>
            <label className="font-semibold text-charcoal/70 block mb-1">
              Standard Fallback Reply (when facts unavailable)
            </label>
            <textarea
              rows={3}
              value={fallbackReply}
              onChange={(e) => setFallbackReply(e.target.value)}
              className="w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal/70 block mb-1">
              Unconfigured Project Reply (no facts published yet)
            </label>
            <textarea
              rows={3}
              value={unconfiguredReply}
              onChange={(e) => setUnconfiguredReply(e.target.value)}
              className="w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Multilingual Support Settings */}
      <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-charcoal" />
            <h3 className="font-serif text-base font-bold text-charcoal">
              Supported Buyer Conversation Languages
            </h3>
          </div>
          <span className="text-xs text-charcoal/60">
            {languages.filter((l) => l.is_enabled).length} active languages
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-xs">
            <thead>
              <tr className="border-b border-charcoal/10 text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
                <th className="pb-3 pl-1">Language Name</th>
                <th className="pb-3">Native Script</th>
                <th className="pb-3 text-center">Default Language</th>
                <th className="pb-3 pr-1 text-right">Enabled Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5 font-medium text-charcoal">
              {languages.map((lang) => (
                <tr key={lang.code} className="hover:bg-charcoal/[0.02]">
                  <td className="py-3 pl-1">
                    <span className="font-bold text-charcoal">{lang.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-charcoal/40 uppercase">
                      ({lang.code})
                    </span>
                  </td>
                  <td className="py-3 font-medium text-charcoal/70">{lang.native_name}</td>
                  <td className="py-3 text-center">
                    <input
                      type="radio"
                      name="default_language"
                      checked={lang.is_default}
                      onChange={() => setDefaultLanguage(lang.code)}
                      className="size-4 text-charcoal focus:ring-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 pr-1 text-right">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={lang.is_enabled}
                        onChange={() => toggleLanguageEnabled(lang.code)}
                        disabled={lang.is_default}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-charcoal/20 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-charcoal peer-checked:after:translate-x-full peer-disabled:opacity-50" />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          id="save-ai-settings-btn"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-charcoal/90 disabled:opacity-50"
        >
          <Save className="size-4" />
          <span>{isSaving ? "Saving Settings..." : "Save AI & Language Settings"}</span>
        </button>
      </div>
    </form>
  );
}
