// Client-safe option lists and rules for the ticket wizard's attendee profile.
// No server-only imports here (no mongoose/mongodb): the forms import this in
// the browser, and /api/demographics imports the same lists to validate, so
// the two can never disagree about what a valid answer is.
//
// Labels live beside their values in both languages rather than in
// messages/*.json. There are a few hundred of them, they are data rather than
// copy, and keeping each option's value and labels on one line is what keeps
// the English and French lists from drifting apart.

export interface Option {
  value: string;
  en: string;
  fr: string;
}

export type Locale = "en-CA" | "fr-CA";

export const optionLabel = (option: Option, locale: string) =>
  locale === "fr-CA" ? option.fr : option.en;

export const OTHER = "other";

export const PRONOUN_OPTIONS: Option[] = [
  { value: "he-him", en: "He/him", fr: "Il/lui" },
  { value: "she-her", en: "She/her", fr: "Elle" },
  { value: "they-them", en: "They/them", fr: "Iel" },
  { value: "prefer-not", en: "Prefer not to say", fr: "Je préfère ne pas répondre" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const ATTENDEE_TYPE_OPTIONS: Option[] = [
  { value: "student", en: "Student", fr: "Étudiant·e" },
  { value: "recent-graduate", en: "Recent graduate", fr: "Récemment diplômé·e" },
  { value: "professional", en: "Professional", fr: "Professionnel·le" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const STUDIES_TYPES = ["student", "recent-graduate"];
export const SCHOOL_TYPES = ["student", "recent-graduate"];
export const WORK_TYPES = ["recent-graduate", "professional", OTHER];

export const FIELD_OF_STUDY_OPTIONS: Option[] = [
  { value: "computer-science", en: "Computer Science", fr: "Informatique" },
  { value: "software-engineering", en: "Software Engineering", fr: "Génie logiciel" },
  { value: "computer-engineering", en: "Computer Engineering", fr: "Génie informatique" },
  { value: "electrical-engineering", en: "Electrical Engineering", fr: "Génie électrique" },
  { value: "data-science", en: "Data Science", fr: "Science des données" },
  { value: "math-stats", en: "Mathematics or Statistics", fr: "Mathématiques ou statistique" },
  { value: "cybersecurity", en: "Cybersecurity", fr: "Cybersécurité" },
  { value: "information-technology", en: "Information Technology", fr: "Technologies de l’information" },
  { value: "design-ux", en: "Design or UX", fr: "Design ou UX" },
  { value: "business", en: "Business or Commerce", fr: "Administration ou commerce" },
  { value: "other-engineering", en: "Another engineering field", fr: "Autre domaine du génie" },
  { value: "non-technical", en: "Another non-technical field", fr: "Autre domaine non technique" },
  { value: "undeclared", en: "Undeclared", fr: "Non déclaré" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const CREDENTIAL_OPTIONS: Option[] = [
  { value: "diploma-dec", en: "Diploma or DEC", fr: "Diplôme ou DEC" },
  { value: "certificate", en: "Certificate", fr: "Certificat" },
  { value: "bachelors", en: "Bachelor’s degree", fr: "Baccalauréat" },
  { value: "masters", en: "Master’s degree", fr: "Maîtrise" },
  { value: "doctorate", en: "Doctorate", fr: "Doctorat" },
  { value: "bootcamp", en: "Bootcamp or professional program", fr: "Bootcamp ou programme professionnel" },
  { value: "none", en: "Not currently pursuing a credential", fr: "Aucun diplôme en cours" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const STUDY_LEVEL_OPTIONS: Option[] = [
  { value: "year-1", en: "First year", fr: "Première année" },
  { value: "year-2", en: "Second year", fr: "Deuxième année" },
  { value: "year-3", en: "Third year", fr: "Troisième année" },
  { value: "year-4", en: "Fourth year", fr: "Quatrième année" },
  { value: "year-5-plus", en: "Fifth year or later", fr: "Cinquième année ou plus" },
  { value: "graduate", en: "Graduate student", fr: "Études supérieures" },
  { value: "recently-graduated", en: "Recently graduated", fr: "Récemment diplômé·e" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

const SEASONS: { value: string; en: string; fr: string }[] = [
  { value: "winter", en: "Winter", fr: "Hiver" },
  { value: "spring", en: "Spring", fr: "Printemps" },
  { value: "summer", en: "Summer", fr: "Été" },
  { value: "fall", en: "Fall", fr: "Automne" },
];

export const GRADUATION_OPTIONS: Option[] = (() => {
  const terms: Option[] = [];
  for (let year = 2026; year <= 2032; year++) {
    for (const season of SEASONS) {
      if (year === 2026 && season.value !== "fall") continue;
      terms.push({
        value: `${season.value}-${year}`,
        en: `${season.en} ${year}`,
        fr: `${season.fr} ${year}`,
      });
    }
  }
  return [
    ...terms,
    { value: "unsure", en: "Unsure", fr: "Incertain" },
    { value: "graduated", en: "Already graduated", fr: "Déjà diplômé·e" },
  ];
})();

export const INTERNSHIP_COUNT_OPTIONS: Option[] = [
  { value: "0", en: "None yet", fr: "Aucun pour l’instant" },
  { value: "1", en: "1", fr: "1" },
  { value: "2", en: "2", fr: "2" },
  { value: "3", en: "3", fr: "3" },
  { value: "4", en: "4", fr: "4" },
  { value: "5-plus", en: "5 or more", fr: "5 ou plus" },
];

export const CURRENT_ROLE_OPTIONS: Option[] = [
  { value: "software", en: "Software or engineering", fr: "Logiciel ou génie" },
  { value: "data-ai", en: "Data or AI", fr: "Données ou IA" },
  { value: "product", en: "Product", fr: "Produit" },
  { value: "design", en: "Design", fr: "Design" },
  { value: "research", en: "Research", fr: "Recherche" },
  { value: "education", en: "Education", fr: "Enseignement" },
  { value: "recruiting", en: "Recruiting or HR", fr: "Recrutement ou RH" },
  { value: "founder", en: "Founder or executive", fr: "Fondateur·rice ou direction" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const EXPERIENCE_OPTIONS: Option[] = [
  { value: "lt-1", en: "Less than 1 year", fr: "Moins d’un an" },
  { value: "1-2", en: "1 to 2 years", fr: "1 à 2 ans" },
  { value: "3-5", en: "3 to 5 years", fr: "3 à 5 ans" },
  { value: "6-10", en: "6 to 10 years", fr: "6 à 10 ans" },
  { value: "10-plus", en: "More than 10 years", fr: "Plus de 10 ans" },
  { value: "prefer-not", en: "Prefer not to say", fr: "Je préfère ne pas répondre" },
];

export const NOT_LOOKING = "not-looking";

export const OPPORTUNITY_OPTIONS: Option[] = [
  { value: "internship", en: "Internship", fr: "Stage" },
  { value: "coop", en: "Co-op", fr: "Stage coop" },
  { value: "new-grad", en: "New-graduate position", fr: "Poste de nouveau diplômé" },
  { value: "full-time", en: "Experienced full-time position", fr: "Poste à temps plein expérimenté" },
  { value: "research", en: "Research", fr: "Recherche" },
  { value: "grad-school", en: "Graduate school", fr: "Études supérieures" },
  { value: "entrepreneurship", en: "Entrepreneurship", fr: "Entrepreneuriat" },
  { value: "mentorship", en: "Mentorship", fr: "Mentorat" },
  { value: "volunteering", en: "Volunteering", fr: "Bénévolat" },
  { value: "not-looking", en: "Not currently looking", fr: "Je ne cherche pas en ce moment" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const TECH_AREA_OPTIONS: Option[] = [
  { value: "ai-ml", en: "AI or machine learning", fr: "IA ou apprentissage automatique" },
  { value: "software-engineering", en: "Software engineering", fr: "Génie logiciel" },
  { value: "web", en: "Web development", fr: "Développement web" },
  { value: "mobile", en: "Mobile development", fr: "Développement mobile" },
  { value: "data-science", en: "Data science", fr: "Science des données" },
  { value: "cybersecurity", en: "Cybersecurity", fr: "Cybersécurité" },
  { value: "cloud-devops", en: "Cloud or DevOps", fr: "Infonuagique ou DevOps" },
  { value: "games", en: "Game development", fr: "Développement de jeux" },
  { value: "hardware", en: "Hardware or embedded systems", fr: "Matériel ou systèmes embarqués" },
  { value: "robotics", en: "Robotics", fr: "Robotique" },
  { value: "product", en: "Product management", fr: "Gestion de produit" },
  { value: "design-ux", en: "Design or UX", fr: "Design ou UX" },
  { value: "open-source", en: "Open source", fr: "Logiciel libre" },
  { value: "leadership", en: "Technical leadership", fr: "Leadership technique" },
  { value: "entrepreneurship", en: "Entrepreneurship", fr: "Entrepreneuriat" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const WORK_LOCATION_OPTIONS: Option[] = [
  { value: "quebec", en: "Québec", fr: "Québec" },
  { value: "canada", en: "Elsewhere in Canada", fr: "Ailleurs au Canada" },
  { value: "usa", en: "United States", fr: "États-Unis" },
  { value: "international", en: "Internationally", fr: "À l’international" },
  { value: "remote", en: "Remote", fr: "À distance" },
];

export const WORK_ARRANGEMENT_OPTIONS: Option[] = [
  { value: "in-person", en: "In-person", fr: "En personne" },
  { value: "hybrid", en: "Hybrid", fr: "Hybride" },
  { value: "remote", en: "Remote", fr: "À distance" },
  { value: "no-preference", en: "No preference", fr: "Aucune préférence" },
];

export const ATTEND_REASON_OPTIONS: Option[] = [
  { value: "emerging-tech", en: "Learn about emerging technologies", fr: "Découvrir les technologies émergentes" },
  { value: "technical-skills", en: "Develop technical skills", fr: "Développer mes compétences techniques" },
  { value: "career-paths", en: "Explore career paths", fr: "Explorer des parcours de carrière" },
  { value: "find-job", en: "Find an internship or job", fr: "Trouver un stage ou un emploi" },
  { value: "meet-employers", en: "Meet employers", fr: "Rencontrer des employeurs" },
  { value: "other-schools", en: "Meet students from other schools", fr: "Rencontrer des étudiants d’autres écoles" },
  { value: "my-school", en: "Meet people from my school", fr: "Rencontrer des gens de mon école" },
  { value: "collaborators", en: "Find collaborators", fr: "Trouver des collaborateurs" },
  { value: "showcase", en: "Showcase a project", fr: "Présenter un projet" },
  { value: "feedback", en: "Get feedback", fr: "Obtenir de la rétroaction" },
  { value: "inspired", en: "Get inspired", fr: "Trouver l’inspiration" },
  { value: "delegation", en: "Attend with my delegation", fr: "Venir avec ma délégation" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const SUCCESS_OPTIONS: Option[] = [
  { value: "apply-learning", en: "Learn something I can apply", fr: "Apprendre quelque chose d’applicable" },
  { value: "friends", en: "Make new friends", fr: "Me faire de nouveaux amis" },
  { value: "employer", en: "Meet a potential employer", fr: "Rencontrer un employeur potentiel" },
  { value: "mentor", en: "Find a mentor", fr: "Trouver un mentor" },
  { value: "career-direction", en: "Discover a career direction", fr: "Trouver une orientation de carrière" },
  { value: "feedback", en: "Receive feedback on my work", fr: "Recevoir de la rétroaction sur mon travail" },
  { value: "collaborators", en: "Find future collaborators", fr: "Trouver de futurs collaborateurs" },
  { value: "involved", en: "Become more involved in tech", fr: "M’impliquer davantage en techno" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const SESSION_FORMAT_OPTIONS: Option[] = [
  { value: "keynotes", en: "Keynotes", fr: "Conférences d’ouverture" },
  { value: "technical-talks", en: "Technical talks", fr: "Conférences techniques" },
  { value: "speaker-hosted", en: "Speaker-hosted talks", fr: "Conférences animées par les conférenciers" },
  { value: "career-talks", en: "Career talks", fr: "Conférences carrière" },
  { value: "workshops", en: "Hands-on workshops", fr: "Ateliers pratiques" },
  { value: "panels", en: "Panels", fr: "Panels" },
  { value: "showcases", en: "Project showcases", fr: "Vitrines de projets" },
  { value: "devs-den", en: "Dev’s Den pitch competition", fr: "Compétition de pitch Dev’s Den" },
  { value: "career-fair", en: "Career fair", fr: "Foire de l’emploi" },
  { value: "scavenger-hunt", en: "Scavenger hunt", fr: "Chasse au trésor" },
  { value: "social", en: "Social activities", fr: "Activités sociales" },
  { value: "networking", en: "Structured networking", fr: "Réseautage structuré" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const YES_NO_UNSURE_OPTIONS: Option[] = [
  { value: "yes", en: "Yes", fr: "Oui" },
  { value: "no", en: "No", fr: "Non" },
  { value: "unsure", en: "Not sure", fr: "Pas certain" },
];

export const CONNECT_SCHOOL_OPTIONS: Option[] = [
  { value: "yes", en: "Yes", fr: "Oui" },
  { value: "no", en: "No", fr: "Non" },
  { value: "later", en: "Maybe later", fr: "Peut-être plus tard" },
];

export const INDEPENDENT_DELEGATION = "independent";

export const COMMUNITY_OPTIONS: Option[] = [
  { value: "club-member", en: "Student club member", fr: "Membre d’un club étudiant" },
  { value: "club-exec", en: "Student club executive", fr: "Exécutif d’un club étudiant" },
  { value: "organizer", en: "Conference or hackathon organizer", fr: "Organisateur de conférence ou de hackathon" },
  { value: "ta-tutor", en: "Teaching assistant or tutor", fr: "Auxiliaire d’enseignement ou tuteur" },
  { value: "research", en: "Research", fr: "Recherche" },
  { value: "open-source", en: "Open-source contributor", fr: "Contributeur au logiciel libre" },
  { value: "volunteer", en: "Volunteer", fr: "Bénévole" },
  { value: "projects", en: "Personal-project builder", fr: "Créateur de projets personnels" },
  { value: "not-involved", en: "Not currently involved", fr: "Pas impliqué pour l’instant" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const TRANSPORT_OPTIONS: Option[] = [
  { value: "transit", en: "Local public transit", fr: "Transport en commun local" },
  { value: "train", en: "Train", fr: "Train" },
  { value: "bus", en: "Intercity bus", fr: "Autocar interurbain" },
  { value: "school-bus", en: "School-organized bus", fr: "Autobus organisé par l’école" },
  { value: "carpool", en: "Carpool", fr: "Covoiturage" },
  { value: "car", en: "Personal vehicle", fr: "Véhicule personnel" },
  { value: "flight", en: "Flight", fr: "Avion" },
  { value: "unsure", en: "Not sure", fr: "Pas certain" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const HEARD_FROM_OPTIONS: Option[] = [
  { value: "head-delegate", en: "Head Delegate", fr: "Chef de délégation" },
  { value: "school-email", en: "School or department email", fr: "Courriel de l’école ou du département" },
  { value: "professor", en: "Professor or faculty member", fr: "Professeur ou membre du corps professoral" },
  { value: "club", en: "Student club", fr: "Club étudiant" },
  { value: "friend", en: "Friend or classmate", fr: "Ami ou camarade de classe" },
  { value: "previous-attendee", en: "Previous attendee", fr: "Ancien participant" },
  { value: "organizer", en: "CUSEC organizer", fr: "Organisateur de CUSEC" },
  { value: "linkedin", en: "LinkedIn", fr: "LinkedIn" },
  { value: "instagram", en: "Instagram", fr: "Instagram" },
  { value: "discord", en: "Discord", fr: "Discord" },
  { value: "other-social", en: "Other social media", fr: "Autres médias sociaux" },
  { value: "sponsor", en: "Sponsor or employer", fr: "Commanditaire ou employeur" },
  { value: "search", en: "Search engine", fr: "Moteur de recherche" },
  { value: "attended", en: "Attended previously", fr: "J’ai déjà participé" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const CONVINCED_BY_OPTIONS: Option[] = [
  { value: "speakers", en: "Speaker announcement", fr: "Annonce des conférenciers" },
  { value: "workshops", en: "Workshop or technical session", fr: "Atelier ou séance technique" },
  { value: "career", en: "Career opportunities", fr: "Occasions de carrière" },
  { value: "devs-den", en: "Dev’s Den", fr: "Dev’s Den" },
  { value: "delegation", en: "School delegation", fr: "Délégation de l’école" },
  { value: "friend", en: "Friend attending", fr: "Un ami y participe" },
  { value: "social", en: "Social activities", fr: "Activités sociales" },
  { value: "price", en: "Ticket price", fr: "Prix du billet" },
  { value: "travel-support", en: "Travel or accommodation support", fr: "Aide au voyage ou à l’hébergement" },
  { value: "reputation", en: "CUSEC’s reputation", fr: "La réputation de CUSEC" },
  { value: OTHER, en: "Other", fr: "Autre" },
];

export const FIRST_TIME = "first-time";

export const ATTENDED_OPTIONS: Option[] = [
  { value: FIRST_TIME, en: "First time", fr: "Première fois" },
  { value: "2026", en: "2026", fr: "2026" },
  { value: "2025", en: "2025", fr: "2025" },
  { value: "2024", en: "2024", fr: "2024" },
  { value: "2023", en: "2023", fr: "2023" },
  { value: "earlier", en: "Earlier", fr: "Avant" },
];

export const LIMITS = {
  attendReasons: 3,
  successMeasures: 3,
  techAreas: 5,
  sessionFormats: 5,
} as const;

export const TEXT_MAX = 200;

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const LINK_PATTERNS = {
  linkedinUrl: /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\/[A-Za-z0-9\-_%.]+\/?$/i,
  githubUrl: /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/?$/i,
  portfolioUrl: /^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:\d{1,5})?(\/[^\s"'<>`]*)?$/i,
} as const;

export type LinkField = keyof typeof LINK_PATTERNS;

const LINK_HOSTS: Record<LinkField, RegExp | null> = {
  linkedinUrl: /^([a-z]{2,3}\.)?linkedin\.com$/i,
  githubUrl: /^(www\.)?github\.com$/i,
  portfolioUrl: null,
};

export function isValidLink(field: LinkField, value: string): boolean {
  const url = normalizeUrl(value);
  if (!url) return true;
  if (url.length > TEXT_MAX || /[\s"'<>`\\]/.test(url)) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(parsed.hostname)) return false;

  const host = LINK_HOSTS[field];
  if (host && !host.test(parsed.hostname)) return false;

  return LINK_PATTERNS[field].test(url);
}

export const SECTIONS = ["basics", "background", "goals", "travel", "experience", "links"] as const;
export type SectionId = (typeof SECTIONS)[number];

export const REQUIRED_SECTIONS: SectionId[] = ["basics", "background"];
export const PROFILE_SECTIONS: SectionId[] = ["basics", "background"];
export const INTEREST_SECTIONS: SectionId[] = ["goals", "travel", "experience", "links"];
