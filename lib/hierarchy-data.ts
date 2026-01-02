/**
 * Hardcoded Organizational Hierarchy Data
 * This data will be used to initialize the organizational_hierarchy collection
 */

import type { UserRank } from '@/types/user';

export interface HierarchyEntryData {
  name: string;
  displayName: string;
  rank: UserRank;
  unitManager?: string;
  agencyName: string;
  code?: string;
}

/**
 * Hardcoded hierarchy data
 * Paste your data here in the format:
 * { name: "DISPLAY NAME", displayName: "DISPLAY NAME", rank: "ADV" | "AUM" | "UM" | "SUM" | "ADD", unitManager?: "UNIT MANAGER NAME", agencyName: "AGENCY NAME", code?: "CODE" }
 */
export const HARDCODED_HIERARCHY_DATA: HierarchyEntryData[] = [
  // CE Visayas 1 Direct Agency
  // SUM: Maribel B. Agua (no unitManager - top level)
  { name: "MARIBEL B. AGUA", displayName: "MARIBEL B. AGUA", rank: "SUM", agencyName: "CE VISAYAS 1 DIRECT" },
  
  // UM: Analyn D. Gonzales (reports to Maribel B. Agua)
  { name: "ANALYN D. GONZALES", displayName: "ANALYN D. GONZALES", rank: "UM", unitManager: "MARIBEL B. AGUA", agencyName: "CE VISAYAS 1 DIRECT" },
  
  // Direct Advisors reporting to Maribel B. Agua (SUM level)
  { name: "JAYNE B. FELICILDA", displayName: "JAYNE B. FELICILDA", rank: "ADV", unitManager: "MARIBEL B. AGUA", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "JESSICA D. ARIAS", displayName: "JESSICA D. ARIAS", rank: "ADV", unitManager: "MARIBEL B. AGUA", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "RICHARD O. ROMBLON", displayName: "RICHARD O. ROMBLON", rank: "ADV", unitManager: "MARIBEL B. AGUA", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "ALEJANDRA L. BANDOY", displayName: "ALEJANDRA L. BANDOY", rank: "ADV", unitManager: "MARIBEL B. AGUA", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "RIZA T. HUMANGIT", displayName: "RIZA T. HUMANGIT", rank: "ADV", unitManager: "MARIBEL B. AGUA", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "JANELLE S. SARVIDA", displayName: "JANELLE S. SARVIDA", rank: "ADV", unitManager: "MARIBEL B. AGUA", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "REGINE C. SUHAY", displayName: "REGINE C. SUHAY", rank: "ADV", unitManager: "MARIBEL B. AGUA", agencyName: "CE VISAYAS 1 DIRECT" },
  
  // Advisors reporting to Analyn D. Gonzales (UM level)
  // Note: I/GONZALES/ANALYN/D@ is the UM herself, so we don't include her as an advisor entry
  { name: "ANNIE ROSE P. ABANILLA", displayName: "ANNIE ROSE P. ABANILLA", rank: "ADV", unitManager: "ANALYN D. GONZALES", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "MARY SUSSANE D. PALMA", displayName: "MARY SUSSANE D. PALMA", rank: "ADV", unitManager: "ANALYN D. GONZALES", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "MARICAR R. BASINANG", displayName: "MARICAR R. BASINANG", rank: "ADV", unitManager: "ANALYN D. GONZALES", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "AVA MAY S. ESTONIO", displayName: "AVA MAY S. ESTONIO", rank: "ADV", unitManager: "ANALYN D. GONZALES", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "GENELITA D. MAGBANUA", displayName: "GENELITA D. MAGBANUA", rank: "ADV", unitManager: "ANALYN D. GONZALES", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "RUSH DANIEL C. ABELLA", displayName: "RUSH DANIEL C. ABELLA", rank: "ADV", unitManager: "ANALYN D. GONZALES", agencyName: "CE VISAYAS 1 DIRECT" },
  { name: "JOANN N. SALVATIERRA", displayName: "JOANN N. SALVATIERRA", rank: "ADV", unitManager: "ANALYN D. GONZALES", agencyName: "CE VISAYAS 1 DIRECT" },

  // CEBU-EZ MATUNOG AGENCY
  // SUMs (top level, no unitManager)
  { name: "HERMELYN V. SIMENE", displayName: "HERMELYN V. SIMENE", rank: "SUM", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "MA EMELYN D. TAN", displayName: "MA EMELYN D. TAN", rank: "SUM", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  
  // District Directors and UMs directly under CEBU-EZ MATUNOG AGENCY (not under an SUM)
  // Note: Maria Estrella C. Matunog is a District Director (ADD) but has a direct unit
  { name: "MARIA ESTRELLA C. MATUNOG", displayName: "MARIA ESTRELLA C. MATUNOG", rank: "ADD", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  
  // UMs directly under CEBU-EZ MATUNOG AGENCY (not under an SUM)
  { name: "MARY KATE M. ACADEMIA", displayName: "MARY KATE M. ACADEMIA", rank: "UM", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "ARCHIE S. BIGNO", displayName: "ARCHIE S. BIGNO", rank: "UM", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "VIRGINIA B. IWAY", displayName: "VIRGINIA B. IWAY", rank: "UM", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "EVELYN C. MONDERO", displayName: "EVELYN C. MONDERO", rank: "UM", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "DARLYN L. PEREZ", displayName: "DARLYN L. PEREZ", rank: "UM", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  
  // CEBU-MATUNOG AGENCY (separate agency)
  // Note: Nilo B. Matunog is a District Director (ADD) but has a direct unit
  { name: "NILO B. MATUNOG", displayName: "NILO B. MATUNOG", rank: "ADD", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // UMs under SUM Hermelyn V. Simene
  // Note: I/SIMENE/HERMELYN/V@ is the SUM herself, so we don't include her as a UM entry
  { name: "JUDEZA F. BALISCO", displayName: "JUDEZA F. BALISCO", rank: "UM", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "RANET L. CANU OG", displayName: "RANET L. CANU OG", rank: "UM", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "NATHALIE ROSE E. COLIMBO", displayName: "NATHALIE ROSE E. COLIMBO", rank: "UM", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JEHZA F. ERAZO", displayName: "JEHZA F. ERAZO", rank: "UM", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JANICE I. NUNEZ", displayName: "JANICE I. NUNEZ", rank: "UM", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Direct Advisors reporting to SUM Hermelyn V. Simene
  { name: "JAY B. ALOTA", displayName: "JAY B. ALOTA", rank: "ADV", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ROSEMARIE A. ANDUYAN", displayName: "ROSEMARIE A. ANDUYAN", rank: "ADV", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARIA SHEILA A. ANUADA", displayName: "MARIA SHEILA A. ANUADA", rank: "ADV", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "SUZANNE RAFAELA G. BILLONES", displayName: "SUZANNE RAFAELA G. BILLONES", rank: "ADV", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "KEZIAH V. DELA CERNA", displayName: "KEZIAH V. DELA CERNA", rank: "ADV", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "VICENTE MANUEL D. FARRARONS", displayName: "VICENTE MANUEL D. FARRARONS", rank: "ADV", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MAY V. RODIS", displayName: "MAY V. RODIS", rank: "ADV", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "HELYN V. SARONA", displayName: "HELYN V. SARONA", rank: "ADV", unitManager: "HERMELYN V. SIMENE", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Judeza F. Balisco
  { name: "MICHAEL M. BALISCO", displayName: "MICHAEL M. BALISCO", rank: "ADV", unitManager: "JUDEZA F. BALISCO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "INEE KRISTINE B. FRANCISCO", displayName: "INEE KRISTINE B. FRANCISCO", rank: "ADV", unitManager: "JUDEZA F. BALISCO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JULIET F. JOSEPH", displayName: "JULIET F. JOSEPH", rank: "ADV", unitManager: "JUDEZA F. BALISCO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ARNIEL F. RODRIGUEZ", displayName: "ARNIEL F. RODRIGUEZ", rank: "ADV", unitManager: "JUDEZA F. BALISCO", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Ranet L. Canu OG
  // Note: I/CANU OG/RANET/L@ is the UM herself, so we don't include her as an advisor entry
  { name: "EMMA P. ALQUISALAS", displayName: "EMMA P. ALQUISALAS", rank: "ADV", unitManager: "RANET L. CANU OG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "DIVINA A. AMPARO", displayName: "DIVINA A. AMPARO", rank: "ADV", unitManager: "RANET L. CANU OG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ANA LOU C. CABALLERO", displayName: "ANA LOU C. CABALLERO", rank: "ADV", unitManager: "RANET L. CANU OG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ARLENE P. CANETE", displayName: "ARLENE P. CANETE", rank: "ADV", unitManager: "RANET L. CANU OG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "NIEL B. CANU-OG", displayName: "NIEL B. CANU-OG", rank: "ADV", unitManager: "RANET L. CANU OG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "RUTH U. PAGARAO", displayName: "RUTH U. PAGARAO", rank: "ADV", unitManager: "RANET L. CANU OG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "NIDA M. PILAPIL", displayName: "NIDA M. PILAPIL", rank: "ADV", unitManager: "RANET L. CANU OG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JANICE S. PINILI", displayName: "JANICE S. PINILI", rank: "ADV", unitManager: "RANET L. CANU OG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ALDEMIOLA C. VICTORIANO", displayName: "ALDEMIOLA C. VICTORIANO", rank: "ADV", unitManager: "RANET L. CANU OG", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Nathalie Rose E. Colimbo
  // Note: I/COLIMBO/NATHALIE ROSE/E@ is the UM herself, so we don't include her as an advisor entry
  { name: "MAY THERESE SUNSHINE S. BELLEZA", displayName: "MAY THERESE SUNSHINE S. BELLEZA", rank: "ADV", unitManager: "NATHALIE ROSE E. COLIMBO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "LOUIE T. COLIMBO", displayName: "LOUIE T. COLIMBO", rank: "ADV", unitManager: "NATHALIE ROSE E. COLIMBO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "SOPHIA DOMINIQUE ROSE E. COLIMBO", displayName: "SOPHIA DOMINIQUE ROSE E. COLIMBO", rank: "ADV", unitManager: "NATHALIE ROSE E. COLIMBO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "REYNALDO M. ERAZO", displayName: "REYNALDO M. ERAZO", rank: "ADV", unitManager: "NATHALIE ROSE E. COLIMBO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "RINA KLAIRE D. FERROLINO", displayName: "RINA KLAIRE D. FERROLINO", rank: "ADV", unitManager: "NATHALIE ROSE E. COLIMBO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "GLENDA C. MARCUELO", displayName: "GLENDA C. MARCUELO", rank: "ADV", unitManager: "NATHALIE ROSE E. COLIMBO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ELMAR Y. VILLAHERMOSA", displayName: "ELMAR Y. VILLAHERMOSA", rank: "ADV", unitManager: "NATHALIE ROSE E. COLIMBO", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Jehza F. Erazo
  // Note: I/ERAZO/JEHZA/F@ is the UM herself, so we don't include her as an advisor entry
  { name: "JO-ANN A. BATION", displayName: "JO-ANN A. BATION", rank: "ADV", unitManager: "JEHZA F. ERAZO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MICHELLE Y. PERALTA", displayName: "MICHELLE Y. PERALTA", rank: "ADV", unitManager: "JEHZA F. ERAZO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "DIOSCORA A. TANGPUS", displayName: "DIOSCORA A. TANGPUS", rank: "ADV", unitManager: "JEHZA F. ERAZO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MIRA FE P. TANGUB", displayName: "MIRA FE P. TANGUB", rank: "ADV", unitManager: "JEHZA F. ERAZO", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Janice I. Nunez
  // Note: I/NUNEZ/JANICE/I@ is the UM herself, so we don't include her as an advisor entry
  { name: "HILARIO J. BLANCO", displayName: "HILARIO J. BLANCO", rank: "ADV", unitManager: "JANICE I. NUNEZ", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MAYLINDA S. BLANCO", displayName: "MAYLINDA S. BLANCO", rank: "ADV", unitManager: "JANICE I. NUNEZ", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JORY NEIL A. PACTORES", displayName: "JORY NEIL A. PACTORES", rank: "ADV", unitManager: "JANICE I. NUNEZ", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Direct advisors under SUM Ma Emelyn D. Tan
  // Note: I/TAN/MA EMELYN/D@ is the SUM herself, so we don't include her as an advisor entry
  { name: "MA ANGELICA M. AMBRAD", displayName: "MA ANGELICA M. AMBRAD", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "NINA G. BOLINGOT", displayName: "NINA G. BOLINGOT", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "GEOFFREY RALPH C. BUOT", displayName: "GEOFFREY RALPH C. BUOT", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "FERL ANN P. FRANZA", displayName: "FERL ANN P. FRANZA", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ANGELINA B. MIER", displayName: "ANGELINA B. MIER", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MA THERESA B. MIER", displayName: "MA THERESA B. MIER", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JENIFER C. ORTEGA", displayName: "JENIFER C. ORTEGA", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "KENNETH T. QUINANOLA", displayName: "KENNETH T. QUINANOLA", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JENYLIN V. ROCES", displayName: "JENYLIN V. ROCES", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "BELGRADE E. RUSSEL", displayName: "BELGRADE E. RUSSEL", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "GESELLE B. SACLOT", displayName: "GESELLE B. SACLOT", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MICO B. SACLOT", displayName: "MICO B. SACLOT", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "GENEVIC C. TABILIRAN", displayName: "GENEVIC C. TABILIRAN", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JASMIN P. UY", displayName: "JASMIN P. UY", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "HONEY GRACE B. ZUNIEGA", displayName: "HONEY GRACE B. ZUNIEGA", rank: "ADV", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // UMs under SUM Ma Emelyn D. Tan
  // Note: I/TAN/MA EMELYN/D@ is the SUM herself, so we don't include her as a UM entry
  { name: "JESSICA G. BACULAN", displayName: "JESSICA G. BACULAN", rank: "UM", unitManager: "MA EMELYN D. TAN", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Jessica G. Baculan
  // Note: I/BACULAN/JESSICA/G@ is the UM herself, so we don't include her as an advisor entry
  { name: "VANIZA C. BASCAO", displayName: "VANIZA C. BASCAO", rank: "ADV", unitManager: "JESSICA G. BACULAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ALNIE JANE S. DAANOY", displayName: "ALNIE JANE S. DAANOY", rank: "ADV", unitManager: "JESSICA G. BACULAN", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "GREGOR U. GACUS", displayName: "GREGOR U. GACUS", rank: "ADV", unitManager: "JESSICA G. BACULAN", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Direct advisors under District Director Maria Estrella C. Matunog
  // Note: I/MATUNOG/MARIA ESTRELLA/C@ is the District Director herself, so we don't include her as an advisor entry
  { name: "JASMIN L. ALCALEN", displayName: "JASMIN L. ALCALEN", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "SHELSEA M. ALESNA", displayName: "SHELSEA M. ALESNA", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MELINA B. ANDOG", displayName: "MELINA B. ANDOG", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "DIANA MAE H. BAROMAN", displayName: "DIANA MAE H. BAROMAN", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JOY MARIE C. BARTOLOME", displayName: "JOY MARIE C. BARTOLOME", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JOHNPAUL E. BASA", displayName: "JOHNPAUL E. BASA", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARY GRACE G. CABALLES", displayName: "MARY GRACE G. CABALLES", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "LORETA LYNN J. CARWANA", displayName: "LORETA LYNN J. CARWANA", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "PAUL FRANCIS II M. CUIZON", displayName: "PAUL FRANCIS II M. CUIZON", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CYD H. DELA CASA", displayName: "CYD H. DELA CASA", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "DIANNE A. DENIEGA", displayName: "DIANNE A. DENIEGA", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "AERON CURL A. EUGENIO", displayName: "AERON CURL A. EUGENIO", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "SHERRYLYN C. LABADAN", displayName: "SHERRYLYN C. LABADAN", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CHEVY P. MODESTO", displayName: "CHEVY P. MODESTO", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARY JEAN S. POL", displayName: "MARY JEAN S. POL", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "AMORGANDA R. RAGO", displayName: "AMORGANDA R. RAGO", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "TRYZHA A. RECTO", displayName: "TRYZHA A. RECTO", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JADE B. SACDALAN", displayName: "JADE B. SACDALAN", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ALMA B. SALDO", displayName: "ALMA B. SALDO", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CHRISTY MAE C. SANDAGA", displayName: "CHRISTY MAE C. SANDAGA", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ROWENA M. SIBI", displayName: "ROWENA M. SIBI", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ERENIO F. TULBO", displayName: "ERENIO F. TULBO", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "AYE WIN", displayName: "AYE WIN", rank: "ADV", unitManager: "MARIA ESTRELLA C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Mary Kate M. Academia
  // Note: I/ACADEMIA/MARY KATE/M@ is the UM herself, so we don't include her as an advisor entry
  { name: "MARICAR J. ANOSA", displayName: "MARICAR J. ANOSA", rank: "ADV", unitManager: "MARY KATE M. ACADEMIA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "FREECY T. ASOY", displayName: "FREECY T. ASOY", rank: "ADV", unitManager: "MARY KATE M. ACADEMIA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "RALF JUDIEL E. BAYNOSA", displayName: "RALF JUDIEL E. BAYNOSA", rank: "ADV", unitManager: "MARY KATE M. ACADEMIA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARIA ANGELIKA B. LIM", displayName: "MARIA ANGELIKA B. LIM", rank: "ADV", unitManager: "MARY KATE M. ACADEMIA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MAE C. LINDO", displayName: "MAE C. LINDO", rank: "ADV", unitManager: "MARY KATE M. ACADEMIA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ZANDRA Z. MONTECILLO", displayName: "ZANDRA Z. MONTECILLO", rank: "ADV", unitManager: "MARY KATE M. ACADEMIA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARIO ISRAEL RAUDA ALFARO", displayName: "MARIO ISRAEL RAUDA ALFARO", rank: "ADV", unitManager: "MARY KATE M. ACADEMIA", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Archie S. Bigno
  // Note: I/BIGNO/ARCHIE/S@ is the UM himself, so we don't include him as an advisor entry
  { name: "FLORGIE MAY P. BIGNO", displayName: "FLORGIE MAY P. BIGNO", rank: "ADV", unitManager: "ARCHIE S. BIGNO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CRISTONI JOHN G. SALINIO", displayName: "CRISTONI JOHN G. SALINIO", rank: "ADV", unitManager: "ARCHIE S. BIGNO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "EMILYN T. SURIGAO", displayName: "EMILYN T. SURIGAO", rank: "ADV", unitManager: "ARCHIE S. BIGNO", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Virginia B. Iway
  // Note: I/IWAY/VIRGINIA/B@ is the UM herself, so we don't include her as an advisor entry
  { name: "ELTON T. BERMISO", displayName: "ELTON T. BERMISO", rank: "ADV", unitManager: "VIRGINIA B. IWAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ROSE MARIE G. BERMISO", displayName: "ROSE MARIE G. BERMISO", rank: "ADV", unitManager: "VIRGINIA B. IWAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "GEMMA T. LATINAZO", displayName: "GEMMA T. LATINAZO", rank: "ADV", unitManager: "VIRGINIA B. IWAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "DENNI DOMINIC M. LEPON", displayName: "DENNI DOMINIC M. LEPON", rank: "ADV", unitManager: "VIRGINIA B. IWAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "GERALYN JANE D. LEPON", displayName: "GERALYN JANE D. LEPON", rank: "ADV", unitManager: "VIRGINIA B. IWAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MICHELLE R. LOMODAG", displayName: "MICHELLE R. LOMODAG", rank: "ADV", unitManager: "VIRGINIA B. IWAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "NELMAR L. SAYSON", displayName: "NELMAR L. SAYSON", rank: "ADV", unitManager: "VIRGINIA B. IWAY", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Evelyn C. Mondero
  // Note: I/MONDERO/EVELYN/C@ is the UM herself, so we don't include her as an advisor entry
  { name: "MARIA CRISTINA M. MONDRAGON", displayName: "MARIA CRISTINA M. MONDRAGON", rank: "ADV", unitManager: "EVELYN C. MONDERO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "NINFA E. PEDRERA", displayName: "NINFA E. PEDRERA", rank: "ADV", unitManager: "EVELYN C. MONDERO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "RITCHIEL B. SENO", displayName: "RITCHIEL B. SENO", rank: "ADV", unitManager: "EVELYN C. MONDERO", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ARNEL T. TUNDAG", displayName: "ARNEL T. TUNDAG", rank: "ADV", unitManager: "EVELYN C. MONDERO", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Darlyn L. Perez
  // Note: I/PEREZ/DARLYN/L@ is the UM herself, so we don't include her as an advisor entry
  { name: "KRISTLYNNE JOYCE P. ARDIENTE", displayName: "KRISTLYNNE JOYCE P. ARDIENTE", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "ESTHER LINDA L. BARCELO", displayName: "ESTHER LINDA L. BARCELO", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "CLARK JOHAN Z. CAROPE", displayName: "CLARK JOHAN Z. CAROPE", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "EUNICE FAYE T. CUIZON", displayName: "EUNICE FAYE T. CUIZON", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "RAYMART M. DERAMA", displayName: "RAYMART M. DERAMA", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "ANNA CRISTINA O. ESTANDARTE", displayName: "ANNA CRISTINA O. ESTANDARTE", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "WILFREDO F. MONTERMOSO", displayName: "WILFREDO F. MONTERMOSO", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "REXELIETO JR M. NACUA", displayName: "REXELIETO JR M. NACUA", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "MARC JOHN R. PEREZ", displayName: "MARC JOHN R. PEREZ", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "LEONOVIE B. SUAN", displayName: "LEONOVIE B. SUAN", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "ALJON C. TUYOR", displayName: "ALJON C. TUYOR", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  { name: "ETHEL MARIE Q. VALMORIA", displayName: "ETHEL MARIE Q. VALMORIA", rank: "ADV", unitManager: "DARLYN L. PEREZ", agencyName: "CEBU-EZ MATUNOG AGENCY" },
  
  // UMs under District Director Nilo B. Matunog
  // Note: I/MATUNOG/NILO/B@ is the District Director himself, so we don't include him as a UM entry
  { name: "NIDA L. ARINGAY", displayName: "NIDA L. ARINGAY", rank: "UM", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JULITO G. GEOLAGON", displayName: "JULITO G. GEOLAGON", rank: "UM", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "HAYDEE I. JALDON", displayName: "HAYDEE I. JALDON", rank: "UM", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARIA ROSARIO C. MATUNOG", displayName: "MARIA ROSARIO C. MATUNOG", rank: "UM", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "SARAH P. RECLA", displayName: "SARAH P. RECLA", rank: "UM", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Direct advisors under District Director Nilo B. Matunog
  // Note: I/MATUNOG/NILO/B@ is the District Director himself, so we don't include him as an advisor entry
  { name: "DAYLINDA A. ALBARRACIN", displayName: "DAYLINDA A. ALBARRACIN", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ANGELITO B. BARLAM", displayName: "ANGELITO B. BARLAM", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CARMEL ANGELI M. BETONIO", displayName: "CARMEL ANGELI M. BETONIO", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "VIRGINIA M. GALAGARAN", displayName: "VIRGINIA M. GALAGARAN", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "NECIAS L. GALAPON", displayName: "NECIAS L. GALAPON", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "LIZA A. INOCIAN", displayName: "LIZA A. INOCIAN", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "FRITZIE M. LICAYAN", displayName: "FRITZIE M. LICAYAN", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARCOS CECILIO E. MACARIOLA", displayName: "MARCOS CECILIO E. MACARIOLA", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CHRISTINE FRANCES R. MORALES", displayName: "CHRISTINE FRANCES R. MORALES", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "REZALYN V. TAYPIN", displayName: "REZALYN V. TAYPIN", rank: "ADV", unitManager: "NILO B. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Nida L. Aringay (under District Director Nilo B. Matunog)
  // Note: I/ARINGAY/NIDA/L@ is the UM herself, so we don't include her as an advisor entry
  { name: "EDGAR C. ARINGAY", displayName: "EDGAR C. ARINGAY", rank: "ADV", unitManager: "NIDA L. ARINGAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JOHN MICHAEL L. ARINGAY", displayName: "JOHN MICHAEL L. ARINGAY", rank: "ADV", unitManager: "NIDA L. ARINGAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MICHAEL D. JARINA", displayName: "MICHAEL D. JARINA", rank: "ADV", unitManager: "NIDA L. ARINGAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CHELSEE ROSEMAE S. MORALDE", displayName: "CHELSEE ROSEMAE S. MORALDE", rank: "ADV", unitManager: "NIDA L. ARINGAY", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARIAH MICHELLE M. ROCA", displayName: "MARIAH MICHELLE M. ROCA", rank: "ADV", unitManager: "NIDA L. ARINGAY", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Julito G. Geolagon (under District Director Nilo B. Matunog)
  // Note: I/GEOLAGON/JULITO/G@ is the UM himself, so we don't include him as an advisor entry
  { name: "ROS LYN T. AQUI", displayName: "ROS LYN T. AQUI", rank: "ADV", unitManager: "JULITO G. GEOLAGON", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ANDREAN RULE L. BOMEDIANO", displayName: "ANDREAN RULE L. BOMEDIANO", rank: "ADV", unitManager: "JULITO G. GEOLAGON", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CARMEL THERESE P. BORROMEO", displayName: "CARMEL THERESE P. BORROMEO", rank: "ADV", unitManager: "JULITO G. GEOLAGON", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "VERONICA E. TOLENTINO", displayName: "VERONICA E. TOLENTINO", rank: "ADV", unitManager: "JULITO G. GEOLAGON", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Haydee I. Jaldon (under District Director Nilo B. Matunog)
  // Note: I/JALDON/HAYDEE/I@ is the UM herself, so we don't include her as an advisor entry
  { name: "CHRISTIE MARIE A. ALKUINO", displayName: "CHRISTIE MARIE A. ALKUINO", rank: "ADV", unitManager: "HAYDEE I. JALDON", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "FRANCIS M. MATHEU", displayName: "FRANCIS M. MATHEU", rank: "ADV", unitManager: "HAYDEE I. JALDON", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARITES B. TALAVER", displayName: "MARITES B. TALAVER", rank: "ADV", unitManager: "HAYDEE I. JALDON", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JULIE ANN L. TAN", displayName: "JULIE ANN L. TAN", rank: "ADV", unitManager: "HAYDEE I. JALDON", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "ALEXANDER S. TEO", displayName: "ALEXANDER S. TEO", rank: "ADV", unitManager: "HAYDEE I. JALDON", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Maria Rosario C. Matunog (under District Director Nilo B. Matunog)
  // Note: I/MATUNOG/MARIA ROSARIO/C@ is the UM herself, so we don't include her as an advisor entry
  { name: "AINSLEY M. ALTERADO", displayName: "AINSLEY M. ALTERADO", rank: "ADV", unitManager: "MARIA ROSARIO C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "HAYDEE D. ARROFO", displayName: "HAYDEE D. ARROFO", rank: "ADV", unitManager: "MARIA ROSARIO C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MONALIZA P. AVENIDO", displayName: "MONALIZA P. AVENIDO", rank: "ADV", unitManager: "MARIA ROSARIO C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "RAYMOND D. BOHOL", displayName: "RAYMOND D. BOHOL", rank: "ADV", unitManager: "MARIA ROSARIO C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARK C. BORJA", displayName: "MARK C. BORJA", rank: "ADV", unitManager: "MARIA ROSARIO C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CHARLINE MAY T. BUNDA", displayName: "CHARLINE MAY T. BUNDA", rank: "ADV", unitManager: "MARIA ROSARIO C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARKLEEN P. CANAS", displayName: "MARKLEEN P. CANAS", rank: "ADV", unitManager: "MARIA ROSARIO C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JONNAH DALE C. MANINGO", displayName: "JONNAH DALE C. MANINGO", rank: "ADV", unitManager: "MARIA ROSARIO C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "SHIELA D. TABIGUE", displayName: "SHIELA D. TABIGUE", rank: "ADV", unitManager: "MARIA ROSARIO C. MATUNOG", agencyName: "CEBU-MATUNOG AGENCY" },
  
  // Advisors under UM Sarah P. Recla (under District Director Nilo B. Matunog)
  // Note: I/RECLA/SARAH/P@ is the UM herself, so we don't include her as an advisor entry
  { name: "GWYNETH MARIE R. JAKOSALEM", displayName: "GWYNETH MARIE R. JAKOSALEM", rank: "ADV", unitManager: "SARAH P. RECLA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MARY ALTHEA R. JAKOSALEM", displayName: "MARY ALTHEA R. JAKOSALEM", rank: "ADV", unitManager: "SARAH P. RECLA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "JEFFREY JOHN S. LIMOTAN", displayName: "JEFFREY JOHN S. LIMOTAN", rank: "ADV", unitManager: "SARAH P. RECLA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "CORAZON F. OUANO", displayName: "CORAZON F. OUANO", rank: "ADV", unitManager: "SARAH P. RECLA", agencyName: "CEBU-MATUNOG AGENCY" },
  { name: "MA PAMELA P. RECLA", displayName: "MA PAMELA P. RECLA", rank: "ADV", unitManager: "SARAH P. RECLA", agencyName: "CEBU-MATUNOG AGENCY" },
];

