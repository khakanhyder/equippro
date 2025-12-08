/**
 * Result Classification Utility
 * Classifies search results as documentation vs offers
 * Used by both API routes and unit tests
 */

export interface ClassifiableResult {
  url: string;
  title: string;
  description?: string;
}

export interface ClassificationResult {
  resultType: string;
  isPdf: boolean;
  isMarketplace: boolean;
  isEquipmentHardware: boolean;
  hasIncidentalMention: boolean;
}

export function classifySearchResult(r: ClassifiableResult): ClassificationResult {
  const url = r.url?.toLowerCase() || '';
  const title = r.title?.toLowerCase() || '';
  const description = (r.description || '')?.toLowerCase() || '';
  const combined = url + ' ' + title + ' ' + description;
  const isPdf = url.includes('.pdf');
  
  // === Known marketplace domains (always → offer) ===
  const marketplaceDomains = [
    'ebay.com', 'ebay.de', 'ebay.co.uk', 'labx.com', 'dotmed.com', 
    'biocompare.com', 'equipnet.com', 'machinio.com', 'questpair.com', 
    'banebio.com', 'thelabworldgroup.com', 'alibaba.com', 'ssllc.com', 
    'reuzeit.com', 'bidspotter.com', 'labplanet.com', 'labwrench.com'
  ];
  const isMarketplace = marketplaceDomains.some(d => url.includes(d));
  
  // === Known documentation domains (strong doc signal) ===
  const isDocDomain = /\b(manualslib|manualsonline|scribd|yumpu|issuu|calameo|pdfdrive)\b/i.test(url);
  const hasDocUrlPath = /\b(manuals?|support|resources|documentation|library|downloads?|docs?|pdf)\b/i.test(url);
  
  // === Equipment hardware detection ("manual valve", "guide rail" etc) ===
  const isEquipmentHardware = 
    /\bmanual\s*(valve|pump|pipett(e|er|or)|hoist|winch|press|mixer|switch|override|jack|lift|clamp|control|reset|toggle|gear|chain|trolley|stapler|sealer|labeler|labeller|sprayer|crimper|pallet|stacker|shear|brake|lathe|mill|router|grinder|saw|tool|fixture|centrifuge|balance|scale|dispenser|cutter|bender|folder|positioner|actuator|drive|feed|loader|transfer|ejector|indexer|rotator|turner|manipulator|handler|separator|filter|screen|sieve|crusher|blender|agitator|conveyor|force|set)\b/i.test(title) ||
    /\b(hand|lever|foot|air|hydraulic|pneumatic|mechanical|rotary|slide|push|pull|crank|wheel|pedal)\s+manual\b/i.test(title) ||
    /\bguide\s*(rail|bar|block|pin|tube|rod|bearing|roller|channel|assembly|bushing|way|track|system)\b/i.test(title) ||
    /\b(linear|slide|drawer|door)\s+guide\b/i.test(title);
  
  // === Incidental mention ("includes manual", "manual included") ===
  const hasIncidentalMention = 
    /\b(includes?|comes?\s*with|sold\s*with|supplied\s*with|packaged\s*with)\s*.{0,30}(manual|guide|datasheet)\b/i.test(combined) ||
    /\b(manual|datasheet)\s*(available|included|provided|enclosed)\b/i.test(combined);
  
  // === Unambiguous documentation patterns (two-word phrases) ===
  const docPatternRegex = /\b(user|owner|operator|service|maintenance|repair|installation|operating|product|technical|instruction|programming|reference|training|safety|calibration|troubleshooting)\s*(manual|handbook)\b/i;
  const docGuideRegex = /\b(operating|quick\s*start|getting\s*started|setup|commissioning|configuration|maintenance|reference|installation)\s*guide\b/i;
  const datasheetRegex = /\b(data\s*sheet|datasheet|spec(ification)?\s*sheet)\b/i;
  const instructionsRegex = /\b(operating|product|maintenance|installation|assembly|setup|use|usage|safety|service)\s*instructions?\b/i;
  const instructionDocRegex = /\binstructions?\s*(manual|booklet|guide|for\s*(use|model|operation))\b/i;
  const possessiveDocRegex = /\b(operator'?s?|owner'?s?|user'?s?)\s*(handbook|manual|guide)\b/i;
  const technicalDocRegex = /\btechnical\s*(data|documentation|reference|specifications?|manual)\b/i;
  const brochureRegex = /\b(product\s*)?(brochure|catalog|catalogue)\b/i;
  
  const unambiguousDocPatternInTitle = 
    docPatternRegex.test(title) || docGuideRegex.test(title) || datasheetRegex.test(title) ||
    instructionsRegex.test(title) || instructionDocRegex.test(title) || possessiveDocRegex.test(title) ||
    technicalDocRegex.test(title) || brochureRegex.test(title);
  
  const unambiguousDocPatternInDesc = 
    docPatternRegex.test(description) || docGuideRegex.test(description) || datasheetRegex.test(description) ||
    instructionsRegex.test(description) || instructionDocRegex.test(description) || possessiveDocRegex.test(description) ||
    technicalDocRegex.test(description) || brochureRegex.test(description);
  
  // === Offer signals ===
  const hasOfferSignals = 
    /\$[\d,]+|\€[\d,]+|[\d,]+\s*(USD|EUR|GBP)/i.test(combined) ||
    /\b(buy\s*now|add\s*to\s*cart|order\s*now|for\s*sale|request\s*quote|pre.?owned|refurbished|auction|lot\s*#?\d*|bid|price)\b/i.test(combined);
  
  // === CLASSIFICATION DECISION TREE ===
  const getDocType = (text: string): string => {
    if (/\b(service|maintenance|repair|troubleshoot)/i.test(text)) return 'service_doc';
    if (/\b(data\s*sheet|datasheet|spec\s*sheet|specification)\b/i.test(text)) return 'datasheet';
    if (/\bbrochure|catalog/i.test(text)) return 'brochure';
    return 'manual';
  };
  
  // SAFEGUARD: These flags prevent documentation classification
  const blockedFromDoc = isMarketplace || isEquipmentHardware || hasIncidentalMention;
  
  let resultType: string;
  
  // RULE 1: Marketplace domain → always offer
  if (isMarketplace) {
    resultType = 'offer';
  }
  // RULE 2: Equipment hardware ("manual valve") → offer
  else if (isEquipmentHardware) {
    resultType = hasOfferSignals || !isPdf ? 'offer' : 'pdf_document';
  }
  // RULE 3: Incidental mention → offer (unless on doc domain)
  else if (hasIncidentalMention && !isDocDomain) {
    resultType = 'offer';
  }
  // RULE 4: Unambiguous doc pattern in TITLE (not blocked) → documentation
  else if (unambiguousDocPatternInTitle && !blockedFromDoc) {
    resultType = getDocType(title);
  }
  // RULE 5: Unambiguous doc pattern in DESCRIPTION + context (not blocked) → documentation
  else if (unambiguousDocPatternInDesc && (hasDocUrlPath || isDocDomain || isPdf) && !blockedFromDoc) {
    resultType = getDocType(description);
  }
  // RULE 6: Doc domain (not blocked) → documentation
  else if (isDocDomain && !blockedFromDoc) {
    resultType = isPdf ? 'manual' : 'web_page';
  }
  // RULE 7: PDF from doc URL path with "manual/guide" in title (not blocked, no offer signals) → documentation
  else if (isPdf && hasDocUrlPath && /\b(manual|guide)\b/i.test(title) && !blockedFromDoc && !hasOfferSignals) {
    resultType = 'manual';
  }
  // RULE 8: Strong offer signals → offer
  else if (hasOfferSignals) {
    resultType = 'offer';
  }
  // RULE 9: Default → pdf_document or web_page
  else {
    resultType = isPdf ? 'pdf_document' : 'web_page';
  }
  
  return {
    resultType,
    isPdf,
    isMarketplace,
    isEquipmentHardware,
    hasIncidentalMention,
  };
}
