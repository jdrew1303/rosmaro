import map from 'lodash/map';
import {initState, mergeNewFSMStates} from './state';
import {nonEmptyArrow} from './../utils';
export {initState};

// res {newFSMState: {}, target: 'a:b:c', entryPoint: 'p'}
const followUp = ({arrow, graph}) => {
  const noArrowToFollow = arrow.length === 0;
  if (noArrowToFollow) throw new Error("unable to follow an arrow");

  // if arrow is [['a:b', 'x'], ['a', 'y']] then srcNode is 'a:b' and the arrowName is 'x'
  const [[srcNode, arrowName], ...higherArrows] = arrow;
  const parent = graph[srcNode].parent;
  const parentIsGraph = graph[parent].type === "graph";
  // only a graph may have arrows
  const arrowTarget = parentIsGraph && (graph[parent].arrows[srcNode] || {})[arrowName];

  // this arrow doesn't point at anything at this level, need to go up
  if (!arrowTarget) {
    const higherRes = followUp({
      arrow: higherArrows,
      graph
    });
    return {
      newFSMState: higherRes.newFSMState,
      target: higherRes.target,
      entryPoint: higherRes.entryPoint
    };
  }

  // this arrow points to some node at this level
  const newFSMState = {[parent]: arrowTarget.target};
  return {
    newFSMState,
    ...arrowTarget
  };
};

const followDown = ({FSMState, graph, target, entryPoint}) => {
  const targetNode = graph[target];

  // the target is a leaf, no need to go deeper
  if (targetNode.type === 'leaf') return {
    newFSMState: {}
  }

  // the target is a graph, need to go the specified entry point
  if (targetNode.type === 'graph') {
    const entryPointTarget = targetNode.entryPoints[entryPoint].target;
    const recentChild = target + ":" + 'recent';
    const pickedGraphChild = entryPointTarget === recentChild
      ? {
        target: FSMState[target],
        entryPoint: targetNode.entryPoints[entryPoint].entryPoint
      }
      : targetNode.entryPoints[entryPoint];

    const followedFromChild = followDown({
      FSMState,
      graph,
      ...pickedGraphChild
    });
    return {
      newFSMState: {
        [target]: pickedGraphChild.target,
        ...followedFromChild.newFSMState
      }
    };
  }

  // if the target is a composite, need to do a split
  if (targetNode.type === 'composite') {
    const followedOrthogonal = targetNode.nodes
      .map(node => followDown({FSMState, graph, target: node, entryPoint}));
    return {
      newFSMState: mergeNewFSMStates(map(followedOrthogonal, 'newFSMState'))
    };
  }

};

// res: newFSMState
export default ({
  graph, 
  FSMState, 
  arrows: maybeEmptyArrows
}) => {
  const arrows = maybeEmptyArrows.filter(nonEmptyArrow);
  const followArrowUp = arrow => followUp({arrow, graph});
  const followTargetDown = ({target, entryPoint}) => 
    followDown({FSMState, graph, target, entryPoint});
  const allFollowedUp = arrows.map(followArrowUp);

  const allFollowedDown = allFollowedUp.map(followTargetDown);
  const allNewFSMStates = [
    ...map(allFollowedUp, 'newFSMState'),
    ...map(allFollowedDown, 'newFSMState')
  ];
  const newFSMState = {...FSMState, ...mergeNewFSMStates(allNewFSMStates)};
  return newFSMState;
};