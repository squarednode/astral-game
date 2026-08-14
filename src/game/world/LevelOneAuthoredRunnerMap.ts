import type { ProceduralRunnerMap, RunnerChunk } from './ProceduralRunnerMap';

const chunks: RunnerChunk[] = [
  { id:'level1-start', cell:{x:0,z:0}, role:'main', type:'start', sockets:['E'], neighbors:['level1-movement'], mainIndex:0, branchIndex:null },
  { id:'level1-movement', cell:{x:1,z:0}, role:'main', type:'straight', sockets:['E','W'], neighbors:['level1-start','level1-crab'], mainIndex:1, branchIndex:null },
  { id:'level1-crab', cell:{x:2,z:0}, role:'main', type:'straight', sockets:['E','W'], neighbors:['level1-movement','level1-corner-a'], mainIndex:2, branchIndex:null },
  { id:'level1-corner-a', cell:{x:3,z:0}, role:'main', type:'l', sockets:['S','W'], neighbors:['level1-crab','level1-town-junction'], mainIndex:3, branchIndex:null },
  { id:'level1-town-junction', cell:{x:3,z:1}, role:'main', type:'t', sockets:['N','E','S'], neighbors:['level1-corner-a','level1-town-end','level1-wolf-straight'], mainIndex:4, branchIndex:null },
  { id:'level1-town-end', cell:{x:4,z:1}, role:'secret', type:'end', sockets:['W'], neighbors:['level1-town-junction'], mainIndex:null, branchIndex:0 },
  { id:'level1-wolf-straight', cell:{x:3,z:2}, role:'main', type:'straight', sockets:['N','S'], neighbors:['level1-town-junction','level1-wolf-corner'], mainIndex:5, branchIndex:null },
  { id:'level1-wolf-corner', cell:{x:3,z:3}, role:'main', type:'l', sockets:['N','E'], neighbors:['level1-wolf-straight','level1-wolf-junction'], mainIndex:6, branchIndex:null },
  { id:'level1-wolf-junction', cell:{x:4,z:3}, role:'main', type:'t', sockets:['W','E','S'], neighbors:['level1-wolf-corner','level1-boss-exit','level1-mother-end'], mainIndex:7, branchIndex:null },
  { id:'level1-mother-end', cell:{x:4,z:4}, role:'secret', type:'end', sockets:['N'], neighbors:['level1-wolf-junction'], mainIndex:null, branchIndex:1 },
  { id:'level1-boss-exit', cell:{x:5,z:3}, role:'main', type:'exit', sockets:['W'], neighbors:['level1-wolf-junction'], mainIndex:8, branchIndex:null },
];

export const LEVEL_ONE_AUTHORED_RUNNER_MAP: ProceduralRunnerMap = {
  seed: 1,
  chunks,
  startId: 'level1-start',
  exitId: 'level1-boss-exit',
  endIds: ['level1-town-end','level1-mother-end'],
  mainIds: [
    'level1-start','level1-movement','level1-crab','level1-corner-a',
    'level1-town-junction','level1-wolf-straight','level1-wolf-corner',
    'level1-wolf-junction','level1-boss-exit',
  ],
  branchIds: ['level1-town-end','level1-mother-end'],
};

export const LEVEL_ONE_CHUNK_CONTENT = {
  'level1-start': { purpose:'start' },
  'level1-movement': { purpose:'movement-learning' },
  'level1-crab': { purpose:'enemy', enemy:'crab', level:1 },
  'level1-corner-a': { purpose:'travel' },
  'level1-town-junction': {
    purpose:'npc-junction',
    npc:'road-guide',
    dialogue:'Take the road on the left to town. Danger awaits ahead.',
  },
  'level1-town-end': { purpose:'portal', destination:'level1-town' },
  'level1-wolf-straight': { purpose:'enemy', enemy:'wolf', level:1 },
  'level1-wolf-corner': { purpose:'enemy', enemy:'wolf', level:1 },
  'level1-wolf-junction': { purpose:'enemy', enemy:'wolf', level:2 },
  'level1-mother-end': { purpose:'enemy', enemy:'mother-wolf', level:3 },
  'level1-boss-exit': { purpose:'portal', destination:'level1-boss' },
} as const;
