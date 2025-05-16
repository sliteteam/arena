const _ = require('lodash');

/**
 * Constants for BullMQ Pro group states
 */
const GROUP_STATES = {
  WAITING: 'waiting',
  MAXED: 'maxed',
  PAUSED: 'paused',
  LIMITED: 'limited',
  UNKNOWN: 'unknown',
};

const GROUP_STATES_WITHOUT_UNKNOWN = [
  GROUP_STATES.WAITING,
  GROUP_STATES.MAXED,
  GROUP_STATES.PAUSED,
  GROUP_STATES.LIMITED,
];

/**
 * Fetches group status and metadata if applicable
 *
 * @param {Object} queue A BullMQ Pro queue instance
 * @param {String} groupId The group ID to fetch information for
 * @returns {Object} The group information including status, meta, counts, etc.
 */
async function getGroupInfo(queue, groupId) {
  const groupInfo = {
    id: groupId,
    status: null,
  };

  groupInfo.status = await queue.getGroupStatus(groupId);

  groupInfo.meta = await queue.getGroupMeta(groupId);

  groupInfo.activeCount = await queue.getGroupActiveCount(groupId);

  groupInfo.concurrency = await queue.getGroupConcurrency(groupId);

  groupInfo.rateLimit = await queue.getGroupRateLimit(groupId);
  return groupInfo;
}

/**
 * Fetches jobs for a specific group with pagination support
 *
 * @param {Object} queue A BullMQ Pro queue instance
 * @param {String} groupId The group ID to fetch jobs for
 * @param {Number} page Current page number (1-based)
 * @param {Number} pageSize Number of items per page
 * @returns {Object} The group jobs with pagination info
 */
async function getGroupJobs(queue, groupId, page = 1, pageSize = 100) {
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize - 1;

  const jobsOnPage = await queue.getGroupJobs(groupId, startIdx, endIdx);

  const totalJobs = await queue.getGroupJobsCount(groupId);

  // Calculate total pages
  const totalPages = Math.ceil(totalJobs / pageSize);

  return {
    jobs: jobsOnPage,
    totalJobs,
    totalPages,
  };
}

/**
 * Calculates pagination information for UI display
 *
 * @param {Number} currentPage Current page number
 * @param {Number} totalPages Total number of pages
 * @returns {Array} Array of page numbers to display
 */
function calculatePagination(currentPage, totalPages) {
  if (totalPages <= 0) return [];

  // Start with current page and expand outward
  const pages = [];
  const maxPagesToShow = 12;

  // Add current page first
  pages.push(currentPage);

  // Add pages alternating before and after current page
  let before = currentPage - 1;
  let after = currentPage + 1;

  while (
    pages.length < maxPagesToShow &&
    (before >= 1 || after <= totalPages)
  ) {
    if (after <= totalPages) {
      pages.push(after++);
    }
    if (before >= 1 && pages.length < maxPagesToShow) {
      pages.unshift(before--);
    }
  }

  return pages;
}

/**
 * Fetches all groups for a queue and their job state counts
 *
 * @param {Object} queue A BullMQ Pro queue instance
 * @returns {Promise<Array<Object>} Array of group objects { id, status, count }
 */
async function getQueueGroups(queue) {
  const groups = {};
  for (const status of GROUP_STATES_WITHOUT_UNKNOWN) {
    const groupByStatus = await queue.getGroupsByStatus(status);
    for (const group of groupByStatus) {
      groups[group.id] = {
        ...group,
        status,
      };
    }
  }

  return Object.values(groups);
}

const Helpers = {
  GROUP_STATES,
  getGroupInfo,
  getGroupJobs,
  calculatePagination,
  getQueueGroups,
};

module.exports = Helpers;
