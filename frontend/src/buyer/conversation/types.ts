export type SupportedLanguage = "en" | "hi" | "gu";

export type QuickPrompt = {
  id: string;
  label: string;
  text: string;
  language: SupportedLanguage;
  category: "AMENITIES" | "PRICING" | "LOCATION" | "CONFIG" | "VISIT";
};

export const QUICK_PROMPTS: Record<SupportedLanguage, QuickPrompt[]> = {
  en: [
    {
      id: "en-amenities",
      label: "Amenities",
      text: "What amenities are available at this project?",
      language: "en",
      category: "AMENITIES",
    },
    {
      id: "en-config",
      label: "Configurations",
      text: "What apartment configurations and unit layouts are offered?",
      language: "en",
      category: "CONFIG",
    },
    {
      id: "en-pricing",
      label: "Pricing details",
      text: "Can you provide the indicative price range and payment plans?",
      language: "en",
      category: "PRICING",
    },
    {
      id: "en-location",
      label: "Location",
      text: "Where is this project located and what are the major landmarks nearby?",
      language: "en",
      category: "LOCATION",
    },
    {
      id: "en-visit",
      label: "Book site visit",
      text: "I would like to schedule an in-person site visit to see the model flat.",
      language: "en",
      category: "VISIT",
    },
  ],
  hi: [
    {
      id: "hi-amenities",
      label: "सुविधाएं",
      text: "इस प्रोजेक्ट में कौन-कौन सी आधुनिक सुविधाएं और क्लब हाउस उपलब्ध हैं?",
      language: "hi",
      category: "AMENITIES",
    },
    {
      id: "hi-config",
      label: "कॉन्फ़िगरेशन",
      text: "यहाँ 2 BHK और 3 BHK फ्लैट्स के क्या विकल्प उपलब्ध हैं?",
      language: "hi",
      category: "CONFIG",
    },
    {
      id: "hi-pricing",
      label: "कीमत",
      text: "अपार्टमेंट्स की शुरुआती कीमत और पेमेंट प्लान क्या हैं?",
      language: "hi",
      category: "PRICING",
    },
    {
      id: "hi-location",
      label: "स्थान",
      text: "यह प्रोजेक्ट कहाँ स्थित है और आस-पास क्या कनेक्टिविटी है?",
      language: "hi",
      category: "LOCATION",
    },
    {
      id: "hi-visit",
      label: "साइट विज़िट",
      text: "क्या मैं इस सप्ताहांत मॉडल फ्लैट देखने के लिए साइट विज़िट बुक कर सकता हूँ?",
      language: "hi",
      category: "VISIT",
    },
  ],
  gu: [
    {
      id: "gu-amenities",
      label: "સુવિધાઓ",
      text: "આ પ્રોજેક્ટમાં સ્વિમિંગ પૂલ અને જિમ જેવી કઈ સુવિધાઓ ઉપલબ્ધ છે?",
      language: "gu",
      category: "AMENITIES",
    },
    {
      id: "gu-config",
      label: "રૂમ વિકલ્પો",
      text: "પ્રોજેક્ટમાં 2 BHK અને 3 BHK ફ્લેટ્સના કયા કયા લેઆઉટ છે?",
      language: "gu",
      category: "CONFIG",
    },
    {
      id: "gu-pricing",
      label: "કિંમત વિગતો",
      text: "ફ્લેટ્સની અંદાજિત કિંમત અને ચુકવણી યોજના શું છે?",
      language: "gu",
      category: "PRICING",
    },
    {
      id: "gu-location",
      label: "સ્થળ",
      text: "આ પ્રોજેક્ટ ક્યાં આવેલો છે અને મુખ્ય રસ્તાઓ સાથે કનેક્ટિવિટી કેવી છે?",
      language: "gu",
      category: "LOCATION",
    },
    {
      id: "gu-visit",
      label: "મુલાકાત બુક કરો",
      text: "હું પ્રોજેક્ટ જોવા માટે સ્થળ મુલાકાત (Site Visit) બુક કરવા માંગુ છું.",
      language: "gu",
      category: "VISIT",
    },
  ],
};
