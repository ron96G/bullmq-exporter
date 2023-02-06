import { Router } from "express";
import express from "express";
import session from "express-session";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { ensureLoggedIn } from "connect-ensure-login";
import { Queue } from "bullmq";
import { renderLoginPage } from "./views/login";
import logger from "../logger";
import parse from "parse-duration";

export interface User {
  username: string;
  password: string;
  role: string;
}

export interface DashboardOptions {
  basePath: string;
  users: User[];
  cookieSecret: string;
  cookieMaxAge: string;
  queues: Array<Queue>;
}

let users: Map<string, User> = new Map();

passport.use(
  new LocalStrategy(function (username, password, cb) {
    const user = users.get(username);
    if (user !== undefined && user.password === password) {
      return cb(null, { user: user.username, role: user.role });
    }
    return cb(null, false);
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user as any);
});

const ensureRole = (options: any): express.RequestHandler => {
  return (req, res, next) => {
    const user = (req.session as any)?.passport.user;
    if (user.role == options.role) return next();
    res.redirect(options.failureRedirect);
  };
};

export function ConfigureRoutes(app: Router, opts: DashboardOptions) {
  const basePath = opts.basePath;
  const cookieSecret = opts.cookieSecret;
  const queues = opts.queues;
  const cookieMaxAge = parse(opts.cookieMaxAge);
  users = new Map(opts.users.map((u) => [u.username, u]));

  logger.info(
    `Setting up routes for dashboard with basePath ${
      basePath == "" ? "/" : basePath
    }`
  );
  const failedLoginRedirect = basePath + "/ui/login?invalid=true";
  const requireLoginRedirect = basePath + "/ui/login";

  app.use(passport.initialize());
  app.use(
    session({
      secret: cookieSecret,
      saveUninitialized: true,
      resave: true,
      cookie: { maxAge: cookieMaxAge },
    })
  );
  app.use(express.urlencoded({ extended: false }));
  app.use(passport.session());

  app.get(`/ui/login`, (req, res) => {
    res.send(
      renderLoginPage(req.query.invalid === "true", requireLoginRedirect)
    );
  });

  app.post(
    `/ui/login`,
    passport.authenticate("local", { failureRedirect: failedLoginRedirect }),
    (req, res) => {
      const user = (req.session as any)?.passport.user;
      if (user.role == "admin") return res.redirect(`${basePath}/ui/admin`);
      return res.redirect(`${basePath}/ui`);
    }
  );

  // readOnly bull board
  const readOnlyAdapter = new ExpressAdapter();
  readOnlyAdapter.setBasePath(`${basePath}/ui`);
  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q, { readOnlyMode: true })),
    serverAdapter: readOnlyAdapter,
  });

  app.use(
    `/ui`,
    ensureLoggedIn({ redirectTo: requireLoginRedirect }),
    readOnlyAdapter.getRouter()
  );

  // admin bull board
  const adminAdapter = new ExpressAdapter();
  adminAdapter.setBasePath(`${basePath}/ui/admin`);
  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter: adminAdapter,
  });

  app.use(
    `/ui/admin`,
    ensureLoggedIn({ redirectTo: requireLoginRedirect }),
    ensureRole({ role: "admin", failureRedirect: `${basePath}/ui` }),
    adminAdapter.getRouter()
  );
}
