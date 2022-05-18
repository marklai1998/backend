import { NextFunction, Request, Response } from "express";

import * as index from "../index";
import * as google from "../utils/SheetUtils";
import * as date from "../utils/TimeUtils";

import { ProjectCount } from "../entity/ProjectCount";

export class ProjectCountController {
  async getOne(request: Request, response: Response, next: NextFunction) {
    if (!request.params.date) {
      return index.generateError("Specify date");
    }

    const date = request.params.date;
    const dateSplit = date.split(".");
    var isoDate = null;
    if (dateSplit.length === 3) {
      isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
    }

    const projectCount = await ProjectCount.findOne({
      date: isoDate === null ? date : isoDate,
    });

    if (!projectCount) {
      return index.generateError("No entry found for this date");
    }

    return {
      date: projectCount.date,
      projects: projectCount.projects,
    };
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    const projectsAll = await ProjectCount.find();

    const projects = [];
    for (const project of projectsAll) {
      projects.push({
        date: project.date,
        projects: project.projects,
      });
    }

    return projects;
  }

  async set(request: Request, response: Response, next: NextFunction) {
    if (!request.body.projects) {
      return index.generateError("Specify projects");
    }

    const date = new Date();
    let projectCount = await ProjectCount.findOne({
      date: date.toISOString().split("T")[0],
    });

    if (!projectCount) {
      projectCount = new ProjectCount();
      projectCount.date = date;
    }

    projectCount.projects = request.body.projects;

    return index.getValidation(projectCount, "Projects updated");
  }

  async getMilestones(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const scale = parseInt(request.params.scale);

    if (scale < 1000) {
      return index.generateError("Scale must be 1000 or greater");
    }

    const projects = await ProjectCount.find();
    const milestones = [];

    var lastDate = null;
    for (
      var i = scale;
      i < projects[projects.length - 1].projects;
      i += scale
    ) {
      var project = projects.find(function (counter) {
        return counter.projects >= i;
      });
      milestones.push({
        date: project.date,
        days: !lastDate
          ? (new Date(project.date).getTime() -
              new Date("2020-04-13").getTime()) /
            8.64e7
          : (new Date(project.date).getTime() - lastDate.getTime()) / 8.64e7,
        projects: project.projects,
      });
      lastDate = new Date(project.date);
    }

    return milestones;
  }

  async import(request: Request, response: Response, next: NextFunction) {
    const getData = await google.googleSheets.spreadsheets.values.get({
      auth: google.authGoogle,
      spreadsheetId: google.sheetID,
      range: `DataNYC!A2:B`,
    });
    const projects = getData.data.values;
    var counter = 0;

    await ProjectCount.clear();
    for (const p of projects) {
      if (!p[1]) break;

      const dateSplit = p[0].split(".");
      const isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;

      const project = new ProjectCount();
      project.date = new Date(isoDate);
      project.projects = p[1];

      await project.save();
      counter++;
    }

    return index.generateSuccess(`${counter} days imported`);
  }
}
