# Starter Kit

This is a Starter Kit for the Digital Product Jam course. It provides a
configuration of the [Next.js](https://nextjs.org/) framework, and a number of
examples of common patterns and components.

## How to use the Starter Kit

First up, you should be using GitHub's template functionality to create your own
code repository using this repository as a starting point.
[See ther GitHub documentation on creating a repository from a template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template).

Once you have created your own repository from this template, you can use Git to
clone the repository to your local machine.

When you have a local copy of your repository, you can proceed with the next
steps in this document.

## Getting Started

Ensure you have a local copy of the repository, and, in your terminal, navigate
to the root of the repository.

### Install the dependencies

The codebase has libraries it depends on to run - these are refered to as
"dependencies". You need to install these dependencies before you can run the
codebase. To install the dependencies, run the following command in your
terminal:

```bash
npm install
```

### Configure local environment variables

Run the command from the root of the project:

```bash
cp .env.local.template .env.local
```

Environment variables provide a way to pass configuration to your application
without including configuration values directly in the codebase. This is useful
for things like API keys and other sensitive information that you don't want to
be publicly available.

In VS Code, open the `.env.local` file that was created. You can update the
values with real data as described in the file.

### Run the development server

The codebase uses a development server to run the code. This is a server that
runs on your local machine, and allows you to view the code in your browser. To
run the development server, run the following command in your terminal:

```bash
npm run dev
```

## View the application in your browser

Once the server is running, you can view the application in your browser. To do
this, open Chrome (or Chromium), and type the following into the address bar:

```bash
http://localhost:3000
```

## Other commands you can run

The codebase is set up with a number of commands you can run. These are defined
in the `package.json` file, in the `scripts` section. The following are
available:

**Lint your code to detect style and some syntax errors**

```bash
npm run lint
```

**Compile a production build of your app**

```bash
npm run build
```

**Run the compiled production build of the server**

```bash
npm run start
```

**Print out some system info related to your server**

```bash
npm run info
```
