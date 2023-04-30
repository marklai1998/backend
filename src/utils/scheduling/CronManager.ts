import { Request } from "../../entity/statistics/Request";
import { createMissingDays } from "../../entity/statistics/Statistic";

const CronJob = require("cron").CronJob;

const jobs = [];

export function startJob(cronTime: string, callback: () => void) {
  const job = new CronJob(cronTime, callback);
  job.start();
  jobs.push(job);
}

export function initJobs() {
  startJob("0 0 * * *", requestStatsNewDay);
}

/*************************************************************
 *                   Put cron functions here                 *
 *************************************************************/

async function requestStatsNewDay() {
  // Add new entry for todays count
  await createMissingDays();

  // Remove detailed stats from previous days
  const requests = (await Request.find()).filter(
    (request) =>
      request.timestamp.toISOString().split("T")[0] !==
      new Date().toISOString().split("T")[0]
  );

  for (const request of requests) {
    request.remove();
  }
}
