const JobHelpers = require('../helpers/jobHelpers');
const GroupHelpers = require('../helpers/groupHelpers');
const _ = require('lodash');

async function handler(req, res) {
  const {queueName, queueHost, groupId} = req.params;
  const {Queues, Flows} = req.app.locals;
  const queue = await Queues.get(queueName, queueHost);

  if (!queue.IS_BULLMQ_PRO) {
    // Should not happen if links are generated correctly, but good for robustness
    return res.status(400).json({
      message: 'Group functionality not available for this queue',
    });
  }

  // Get the appBasePath to ensure we include any prefix like '/arena'
  const appBasePath = req.app.locals.appBasePath || '';

  // Extract the base URL path without the 'groups' part
  const baseUrlWithoutGroups = req.baseUrl.substring(
    0,
    req.baseUrl.lastIndexOf('/groups')
  );

  // Combine the appBasePath with the baseUrlWithoutGroups to ensure correct path
  const basePath = appBasePath + baseUrlWithoutGroups;

  if (!queue) {
    return res.status(404).render('dashboard/templates/queueNotFound', {
      basePath,
      queueName,
      queueHost,
      hasFlows: Flows.hasFlows(),
    });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 100;

  try {
    // Get group information using our helper
    const groupInfo = await GroupHelpers.getGroupInfo(queue, groupId);

    // Get group jobs with pagination
    const {jobs, totalJobs, totalPages} = await GroupHelpers.getGroupJobs(
      queue,
      groupId,
      page,
      pageSize
    );

    // Calculate pagination
    const pages = GroupHelpers.calculatePagination(page, totalPages);

    return res.render('dashboard/templates/groupDetails', {
      basePath,
      queueName,
      queueHost,
      groupId,
      groupStatus: groupInfo.status,
      groupMeta: groupInfo.meta,
      groupActiveCount: groupInfo.activeCount,
      groupConcurrency: groupInfo.concurrency,
      groupRateLimit: groupInfo.rateLimit,
      jobs,
      jobsInGroupCount: totalJobs,
      currentPage: page,
      pages,
      pageSize,
      lastPage: totalPages,
      hasFlows: Flows.hasFlows(),
      groupStates: GroupHelpers.GROUP_STATES,
    });
  } catch (e) {
    return res.status(500).json({
      message: `Error fetching information for group ${groupId}: ${e.message}`,
    });
  }
}

module.exports = handler;
