import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'hi';

interface Dictionary {
  [key: string]: {
    en: string;
    hi: string;
  };
}

const DICTIONARY: Dictionary = {
  materialIn: { en: 'Material In', hi: 'सामग्री आवक (Inward)' },
  poInward: { en: 'Purchase Material Received (PO)', hi: 'खरीद सामग्री प्राप्त (PO Inward)' },
  loInward: { en: 'Job-Work Return from Vendor (LO)', hi: 'जॉब-वर्क वापसी (LO Inward)' },
  joInward: { en: 'Production Received (JO)', hi: 'उत्पादन प्राप्त (JO Inward)' },
  generalInward: { en: 'Any Other Material In (General)', hi: 'अन्य सामग्री आवक (General)' },
  qualityRequired: { en: 'Quality Inspection Required?', hi: 'क्या गुणवत्ता जांच आवश्यक है?' },
  acceptedQty: { en: 'Accepted Qty (Good Pieces)', hi: 'स्वीकृत मात्रा (सही माल)' },
  rejectedQty: { en: 'Rejected Qty (Defective Pieces)', hi: 'अस्वीकृत मात्रा (खराब माल)' },
  rejectionReason: { en: 'Rejection Reason', hi: 'अस्वीकृति का कारण' },
  goodStock: { en: 'Good Usable Stock', hi: 'उपयोग हेतु उपलब्ध स्टॉक' },
  rejectionStore: { en: 'Rejection Store', hi: 'रिजेक्शन स्टोर (अस्वीकृत)' },
  pendingInspection: { en: 'Pending Quality Inspection', hi: 'जांच हेतु लंबित (Pending QC)' },
  currentStock: { en: 'Current Available Stock', hi: 'वर्तमान उपलब्ध स्टॉक' },
  pendingVendorQty: { en: 'Pending with Vendor', hi: 'वेंडर के पास लंबित मात्रा' },
  itemName: { en: 'Item Name', hi: 'सामग्री का नाम' },
  specification: { en: 'Specification', hi: 'विवरण (Specification)' },
  receivedQty: { en: 'Received Quantity', hi: 'प्राप्त कुल मात्रा' },
  save: { en: 'Save Entry', hi: 'सहेजें (Save)' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  searchItem: { en: 'Type 2-3 letters of item name...', hi: 'सामग्री का नाम टाइप करें...' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    if (DICTIONARY[key]) {
      return DICTIONARY[key][language] || DICTIONARY[key].en;
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
