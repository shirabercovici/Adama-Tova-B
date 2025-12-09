import {
  Concept,
  type Distribution,
  type PromptCompany,
  type PromptIdea,
  type Student,
} from "./types";

function shuffle(arr: unknown[]): unknown[] {
  // https://sebhastian.com/fisher-yates-shuffle-javascript/
  let i = arr.length;
  while (--i > 0) {
    let randIndex = Math.floor(Math.random() * (i + 1));
    [arr[randIndex], arr[i]] = [arr[i], arr[randIndex]];
  }
  return arr;
}

export function fadeInCalls(
  callback: Function,
  initialDelay = 30,
  iterations = 16
) {
  let delay = initialDelay;

  for (let i = 0; i < iterations; i++) {
    setTimeout(() => {
      callback();
    }, delay);

    delay *= 1.3; // More delay for the next iteration
  }
}

export function selectBackGroundColor(colors: string[]): string {
  return shuffle(colors).slice(0, 1)[0] as string;
}

export function selectTransitionColors(colors: string[]): string[] {
  return shuffle(colors).slice(0, 6) as string[];
}

export function makeTeamDistribution(
  developerCount: number,
  designerCount: number
) {
  // this is not a generic algorithm to create team shapes!
  // Assumptions:
  // - ideal team is 3 x 3
  // - always want 3+ devs in a team
  const teamCount = Math.floor(developerCount / 3);
  const developerTeamTarget = 3;
  const designerTeamTarget = Math.floor(designerCount / teamCount);
  const designerTeamExtraCount = designerCount - teamCount * designerTeamTarget;
  const distribution = Array(teamCount)
    .fill({})
    .map((_, i, arr) => {
      // standard team
      const team = {
        developerCount: developerTeamTarget,
        designerCount: designerTeamTarget,
      };
      // developer distribution maybe adjusted
      if (i + 1 === arr.length && developerCount % 3 !== 0)
        team.developerCount = developerTeamTarget + 1;
      // designer distribution maybe adjusted
      if (i + 1 > arr.length - designerTeamExtraCount)
        team.designerCount = designerTeamTarget + 1;
      return team;
    });
  return shuffle(distribution);
}

function selectDesigners(
  ids: [],
  quantity: number,
  assignedStudents: number[]
) {
  const candidates = ids.filter((id) => !assignedStudents.includes(id));
  return shuffle(candidates).slice(0, quantity) as number[];
}

function selectDevelopers(
  ids: [],
  quantity: number,
  assignedStudents: number[]
): number[] {
  const candidates = ids.filter((id) => !assignedStudents.includes(id));
  return shuffle(candidates).slice(0, quantity) as number[];
}

export function makeConcept(
  companies: PromptCompany[],
  ideas: PromptIdea[]
): Concept {
  const candidateNames = companies.map((c) => c.name);
  const candidateIdeas = ideas.map((i) => i.description);
  const name = shuffle(candidateNames)[0] as string;
  const idea = shuffle(candidateIdeas)[0] as string;
  return { name, idea };
}

function groupStudentIds(students: Student[]) {
  return students.reduce((accumulator, current) => {
    if (!accumulator.has(current.group.id)) {
      accumulator.set(current.group.id, []);
    }
    accumulator.get(current.group.id).push(current.id);
    return accumulator;
  }, new Map());
}

export function selectStudents(
  students: Student[],
  assignedStudents: number[],
  teamDistribution: Distribution
): number[] {
  const groupedStudentIds = groupStudentIds(students);
  return [
    ...selectDevelopers(
      groupedStudentIds.get(1),
      teamDistribution.developerCount,
      assignedStudents
    ),
    ...selectDesigners(
      groupedStudentIds.get(2),
      teamDistribution.designerCount,
      assignedStudents
    ),
  ];
}
