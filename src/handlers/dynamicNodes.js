import omit from 'lodash/omit';

const emptyNodesFn = () => [];

export default plan => {

  const remainingPlan = omit(plan, ['nodes']);

  return {
    remainingPlan,
    make: (next) => ({

      ...next,

      nodes: plan.nodes || emptyNodesFn

    })
  };
};