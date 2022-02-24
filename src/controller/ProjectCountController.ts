import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import * as index from "../index";
import * as google from "../utils/SheetUtils";
import * as date from "../utils/TimeUtils";
import { ProjectCount } from "../entity/ProjectCount";

export class ProjectCountController {
  private projectRepository = getRepository(ProjectCount);

  async getOne(request: Request, response: Response, next: NextFunction) {
    if (request.params.date === undefined) {
      return index.generateError("Specify date");
    }

    const date = request.params.date;
    const dateSplit = date.split(".");
    var isoDate = null;
    if (dateSplit.length === 3) {
      isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
    }

    let projectCount = await this.projectRepository.findOne({
      date: isoDate === null ? date : isoDate,
    });

    if (projectCount === undefined) {
      return index.generateError("No entry found for this date");
    }

    return {
      date: date,
      projects: projectCount.projects,
    };
  }

  async getAll(request: Request, response: Response, next: NextFunction) {
    return await this.projectRepository.find();
  }

  async set(request: Request, response: Response, next: NextFunction) {
    if (request.body.projects === undefined) {
      return index.generateError("Specify projects");
    }

    const date = new Date();
    let projectCount = await this.projectRepository.findOne({
      date: date.toISOString().split("T")[0],
    });

    if (projectCount === undefined) {
      projectCount = new ProjectCount();
      projectCount.date = date;
    }

    projectCount.projects = request.body.projects;

    return index.getValidation(
      projectCount,
      this.projectRepository,
      "Projects updated"
    );
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

    let projects = await this.projectRepository.find();
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
        date: date.parseDate(project.date),
        days:
          lastDate === null
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

    await this.projectRepository.clear();
    for (const p of projects) {
      if (p[1] === undefined || p[1] === null || p[1] === "") break;

      const dateSplit = p[0].split(".");
      const isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;

      let project = new ProjectCount();
      project.date = new Date(isoDate);
      project.projects = p[1];

      await this.projectRepository.save(project);
      counter++;
    }

    return index.generateSuccess(`${counter} days imported`);
  }
}
