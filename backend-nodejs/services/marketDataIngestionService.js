const https = require('https');
const JobMarket = require('../models/JobMarket');

const DEFAULT_ROLES = [
  'Software Engineer',
  'Data Scientist',
  'Frontend Developer',
  'Backend Developer',
  'DevOps Engineer',
  'Machine Learning Engineer',
  'Product Manager',
  'Cloud Architect'
];

const SKILL_KEYWORDS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C#', 'Go',
  'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'Terraform',
  'AWS', 'Azure', 'GCP', 'CI/CD', 'Git', 'Linux', 'FastAPI', 'Django', 'Spring Boot',
  'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Pandas', 'NumPy',
  'Scikit-learn', 'NLP', 'Computer Vision', 'GraphQL', 'REST APIs', 'Microservices',
  'Tableau', 'Power BI', 'Agile', 'Scrum'
];

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode, headers } = res;

        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          res.resume();
          getJson(headers.location).then(resolve).catch(reject);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          let errBody = '';
          res.on('data', (chunk) => {
            errBody += chunk;
          });
          res.on('end', () => {
            reject(new Error(`HTTP ${statusCode}: ${errBody.slice(0, 300)}`));
          });
          return;
        }

        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      })
      .on('error', reject);
  });
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function extractSkillsFromJob(job) {
  const haystack = normalizeText(`${job.title || ''} ${job.description || ''}`);
  return SKILL_KEYWORDS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\./g, '\\.');
    const regex = new RegExp(`(^|[^a-z0-9])${escaped.toLowerCase()}([^a-z0-9]|$)`, 'i');
    return regex.test(haystack);
  });
}

function toIndustry(role) {
  const normalized = normalizeText(role);
  if (normalized.includes('data') || normalized.includes('machine learning') || normalized.includes('ai')) {
    return 'Data & AI';
  }
  if (normalized.includes('product')) {
    return 'Product';
  }
  if (normalized.includes('cloud') || normalized.includes('devops') || normalized.includes('site reliability')) {
    return 'Cloud & Infrastructure';
  }
  return 'Software Engineering';
}

function detectRegion(countryName) {
  const c = normalizeText(countryName);
  if (['united states', 'usa', 'canada', 'mexico'].includes(c)) return 'usa';
  if (
    [
      'united kingdom', 'uk', 'ireland', 'germany', 'france', 'spain', 'italy',
      'netherlands', 'sweden', 'norway', 'denmark', 'switzerland', 'poland', 'portugal'
    ].includes(c)
  ) {
    return 'europe';
  }
  return 'asia';
}

function average(numbers) {
  if (!numbers.length) return null;
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  return Math.round(sum / numbers.length);
}

function createSkillMaps(previousDoc) {
  const previousRequired = new Map(
    (previousDoc?.requiredSkills || []).map((s) => [normalizeText(s.skillName), Number(s.frequency || 0)])
  );
  const previousTrending = new Map(
    (previousDoc?.trendingSkills || []).map((s) => [normalizeText(s.skillName), Number(s.demandGrowth || 0)])
  );

  return { previousRequired, previousTrending };
}

async function fetchAdzunaJobsByRole({ role, country, pages, pageSize, appId, appKey }) {
  let allJobs = [];
  let totalCount = 0;

  for (let page = 1; page <= pages; page += 1) {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: role,
      results_per_page: String(pageSize),
      sort_by: 'date',
      'content-type': 'application/json'
    });

    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params.toString()}`;
    const payload = await getJson(url);

    const jobs = Array.isArray(payload.results) ? payload.results : [];
    allJobs = allJobs.concat(jobs);
    totalCount = Math.max(totalCount, Number(payload.count || 0));

    if (jobs.length < pageSize) {
      break;
    }
  }

  return { jobs: allJobs, totalCount };
}

function buildJobMarketDocument(role, jobs, totalCount, previousDoc) {
  const { previousRequired, previousTrending } = createSkillMaps(previousDoc);

  const salaryMins = [];
  const salaryMaxs = [];
  const companyCounter = new Map();
  const countryCounter = new Map();
  const skillCounter = new Map();
  const degreeCounter = { bachelor: 0, master: 0, phd: 0 };

  jobs.forEach((job) => {
    if (Number.isFinite(job.salary_min)) salaryMins.push(Number(job.salary_min));
    if (Number.isFinite(job.salary_max)) salaryMaxs.push(Number(job.salary_max));

    const company = job.company?.display_name;
    if (company) {
      companyCounter.set(company, (companyCounter.get(company) || 0) + 1);
    }

    const locationArea = Array.isArray(job.location?.area) ? job.location.area : [];
    const countryName = locationArea[0] || 'Unknown';
    countryCounter.set(countryName, (countryCounter.get(countryName) || 0) + 1);

    const description = normalizeText(job.description);
    if (description.includes('bachelor')) degreeCounter.bachelor += 1;
    if (description.includes('master')) degreeCounter.master += 1;
    if (description.includes('phd') || description.includes('doctorate')) degreeCounter.phd += 1;

    extractSkillsFromJob(job).forEach((skill) => {
      skillCounter.set(skill, (skillCounter.get(skill) || 0) + 1);
    });
  });

  const sampleSize = Math.max(jobs.length, 1);
  const requiredSkills = [...skillCounter.entries()]
    .map(([skillName, count]) => {
      const frequency = Math.round((count / sampleSize) * 100);
      return {
        skillName,
        frequency,
        salaryImpact: Math.max(3, Math.min(30, Math.round(frequency / 4)))
      };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 18);

  const trendingSkills = requiredSkills
    .slice(0, 12)
    .map((skill) => {
      const prevFreq = previousRequired.get(normalizeText(skill.skillName)) || 0;
      const priorGrowth = previousTrending.get(normalizeText(skill.skillName)) || 0;
      const demandGrowth = Math.round(skill.frequency - prevFreq || priorGrowth || skill.frequency * 0.12);
      const trendScore = Math.max(1, Math.min(10, Math.round(skill.frequency / 10)));

      return {
        skillName: skill.skillName,
        trendScore,
        demandGrowth
      };
    })
    .sort((a, b) => b.trendScore - a.trendScore);

  const topCountries = [...countryCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([countryName]) => countryName);

  const regionTotals = { usa: 0, europe: 0, asia: 0 };
  countryCounter.forEach((count, countryName) => {
    regionTotals[detectRegion(countryName)] += count;
  });

  const growthSignal = trendingSkills.length
    ? trendingSkills.reduce((sum, skill) => sum + Math.max(0, skill.demandGrowth), 0) / trendingSkills.length
    : 0;

  const salaryMin = salaryMins.length ? Math.round(Math.min(...salaryMins)) : previousDoc?.salaryRange?.min || 0;
  const salaryMax = salaryMaxs.length ? Math.round(Math.max(...salaryMaxs)) : previousDoc?.salaryRange?.max || 0;

  const requiredEducation = [];
  if (degreeCounter.bachelor > 0) requiredEducation.push('Bachelor degree or equivalent experience');
  if (degreeCounter.master > 0) requiredEducation.push('Master degree (preferred)');
  if (degreeCounter.phd > 0) requiredEducation.push('PhD (role-dependent)');

  const topCompanies = [...companyCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  return {
    role,
    industry: toIndustry(role),
    jobOpenings: {
      global: Math.max(totalCount, jobs.length),
      usa: regionTotals.usa,
      europe: regionTotals.europe,
      asia: regionTotals.asia
    },
    growthRate: Math.max(1, Math.min(80, Math.round(growthSignal))),
    salaryRange: {
      min: salaryMin,
      max: salaryMax,
      average: average([salaryMin, salaryMax].filter((n) => Number.isFinite(n) && n > 0)) || 0,
      currency: 'USD'
    },
    requiredSkills,
    trendingSkills,
    experienceRequirement: {
      min: 1,
      max: 6
    },
    requiredEducation,
    topCompanies,
    topCountriesByDemand: topCountries,
    careerPath: previousDoc?.careerPath || [],
    lastUpdated: new Date()
  };
}

async function syncMarketData(options = {}) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('Missing Adzuna API credentials. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in backend-nodejs/.env');
  }

  const country = (options.country || process.env.ADZUNA_COUNTRY || 'in').toLowerCase();
  const pages = Math.max(1, Number(options.pages || process.env.ADZUNA_PAGES || 2));
  const pageSize = Math.max(10, Math.min(50, Number(options.pageSize || process.env.ADZUNA_RESULTS_PER_PAGE || 50)));
  const targetRoles = Array.isArray(options.roles) && options.roles.length
    ? options.roles
    : DEFAULT_ROLES;

  const summary = {
    startedAt: new Date().toISOString(),
    country,
    pages,
    pageSize,
    attemptedRoles: targetRoles.length,
    syncedRoles: 0,
    skippedRoles: 0,
    failures: []
  };

  for (const role of targetRoles) {
    try {
      const previousDoc = await JobMarket.findOne({ role });
      const { jobs, totalCount } = await fetchAdzunaJobsByRole({ role, country, pages, pageSize, appId, appKey });

      if (!jobs.length && !previousDoc) {
        summary.skippedRoles += 1;
        summary.failures.push({ role, reason: 'No jobs returned from Adzuna' });
        continue;
      }

      const doc = buildJobMarketDocument(role, jobs, totalCount, previousDoc);

      await JobMarket.findOneAndUpdate(
        { role },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      summary.syncedRoles += 1;
    } catch (error) {
      summary.failures.push({ role, reason: error.message });
    }
  }

  summary.completedAt = new Date().toISOString();
  return summary;
}

module.exports = {
  DEFAULT_ROLES,
  syncMarketData
};
