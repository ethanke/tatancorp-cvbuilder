export interface CVContact {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
}

export interface CVExperience {
  company: string;
  role: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface CVEducation {
  school: string;
  degree: string;
  field: string;
  year: string;
}

export interface CVProject {
  name: string;
  description: string;
  url: string | null;
}

export interface CVContent {
  name: string;
  tagline: string;
  contact: CVContact;
  summary: string;
  experience: CVExperience[];
  education: CVEducation[];
  skills: string[];
  projects: CVProject[];
}

export interface CV {
  id: string;
  title: string;
  target_role: string;
  content: CVContent;
  created_at: string;
  updated_at: string;
}

export const EMPTY_CV_CONTENT: CVContent = {
  name: "",
  tagline: "",
  contact: { email: "", phone: "", location: "", linkedin: "" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
};
