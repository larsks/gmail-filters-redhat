// IMPORTANT NOTE REGARDING LABELS:
//
// A hiearchical label of the form one/two/three will result in the creation of *three* filters, one
// adding label "one", one adding label "one/two", and one adding the label "one/two/three". If you don't
// want this feature and intend to only apply the label "one/two/three", prefix the label with "!":
// "!one/two/three".
//
var FILTERS = [
  {
    // This matches message that mention some variant of my name but that aren't actually to: me
    // and that are not calendar invites.
    criteria: {
      query:
        "{larsks lkellogg kellogg-stedman lars@redhat.com} AND -to:me AND -{has:attachment filename:invite.ics}",
    },
    actions: {
      labels: ["mentions"],
    },
  },
  {
    criteria: {
      query: `has:attachment filename:invite.ics subject:"Accepted:"`,
    },
    actions: {
      archive: true,
      labels: ["calendar/accepted", "!expireafter/5d"],
    },
  },
  {
    criteria: {
      query: `has:attachment filename:invite.ics subject:"Canceled"`,
    },
    actions: {
      labels: ["calendar/canceled", "!expireafter/5d"],
    },
  },
  {
    criteria: {
      query: `has:attachment filename:invite.ics subject:"Declined:"`,
    },
    actions: {
      archive: true,
      labels: ["calendar/declined", "!expireafter/5d"],
    },
  },
  {
    criteria: {
      query: `has:attachment filename:invite.ics subject:"Invitation:"`,
    },
    actions: {
      labels: ["calendar/invitation", "!expireafter/5d"],
    },
  },
  {
    criteria: { query: "list:bss-list.redhat.com bicycle" },
    actions: {
      alwaysImportant: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: "from:notifications@github.com" },
    actions: {
      labels: ["github", "!archiveafter/2d"],
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"devel@lists.fedoraproject.org"' },
    actions: {
      labels: ["list/fedora/devel", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"cloud@lists.fedoraproject.org"' },
    actions: {
      labels: ["list/fedora/cloud", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"users@lists.fedoraproject.org"' },
    actions: {
      labels: ["list/fedora/users", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"outage-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/outage", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rh-openstack-dev@redhat.com"' },
    actions: {
      labels: ["list/redhat/rhos-dev", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"ansible-devel@googlegroups.com"' },
    actions: {
      labels: ["list/ansible/ansible-devel", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"ansible-project@googlegroups.com"' },
    actions: {
      labels: ["list/ansible/ansible-project", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"memo-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/memo-list"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"tech-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/tech-list"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: "replyto:bugs.launchpad.net" },
    actions: {
      labels: ["bug/lp"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: {
      query: "from:bugzilla@redhat.com",
    },
    actions: {
      labels: ["bug/redhat"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: {
      query: "from:(jira-issues@redhat.com OR jira@redhat.atlassian.net)",
    },
    actions: {
      labels: ["bug/redhat"],
      neverSpam: true,
    },
  },
  {
    criteria: {
      query: "from:jira@redhat.atlassian.net subject:OSAC",
    },
    actions: {
      labels: ["!bug/redhat/osac"],
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"prod-dept@redhat.com"' },
    actions: {
      labels: ["list/redhat/prod-dept", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack@lists.openstack.org"' },
    actions: {
      labels: ["list/openstack/users", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-discuss@lists.openstack.org"' },
    actions: {
      labels: ["list/openstack/discuss", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"users@lists.libvirt.org"' },
    actions: {
      labels: ["list/libvirt-users", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"devel@lists.libvirt.org"' },
    actions: {
      labels: ["list/libvirt-devel", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rhos-tech@redhat.com"' },
    actions: {
      labels: ["list/redhat/rhos-tech", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rhos-prio-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/rhos-prio", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-dev@lists.openstack.org"' },
    actions: {
      labels: ["list/openstack/openstack-dev", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { from: "review@openstack.org" },
    actions: {
      labels: ["review/openstack"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { from: "gerrit@review.rdoproject.org" },
    actions: {
      labels: ["review/rdoproject"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"cloud-strategy@redhat.com"' },
    actions: {
      labels: ["list/redhat/cloud-strategy", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"os-devel-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/os-devel", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-program@redhat.com"' },
    actions: {
      labels: ["list/redhat/openstack-program", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"systemd-devel@lists.freedesktop.org"' },
    actions: {
      labels: ["list/systemd-devel", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-status@redhat.com"' },
    actions: {
      labels: ["list/redhat/openstack-status", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"boston-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/boston-list"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"bss-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/bss-list"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"git@vger.kernel.org"' },
    actions: {
      labels: ["list/linux/kernel", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-operators@lists.openstack.org"' },
    actions: {
      labels: ["list/openstack/openstack-operators", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"users@clusterlabs.org"' },
    actions: {
      labels: ["list/pacemaker-users", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"users@lists.rdoproject.org"' },
    actions: {
      labels: ["list/rdo/users", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"dev@lists.rdoproject.org"' },
    actions: {
      labels: ["list/rdo/dev", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rdo-list@redhat.com"' },
    actions: {
      labels: ["list/rdo-list", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"cloud-dept-status@redhat.com"' },
    actions: {
      labels: ["list/redhat/cloud-dept-status", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"python-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/python", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"atomic-devel@projectatomic.io"' },
    actions: {
      labels: ["list/atomic-devel", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"centos-devel@centos.org"' },
    actions: {
      labels: ["list/centos-devel", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"friday-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/friday-list", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"atomic@projectatomic.io"' },
    actions: {
      labels: ["list/atomic", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rh-ms-azure-users@redhat.com"' },
    actions: {
      labels: ["list/redhat/rh-ms-azure-users", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: '"needinfo?(lars@redhat.com)"' },
    actions: {
      star: true,
    },
  },
  {
    criteria: {
      subject: '"Friday Five"',
      query: "list:announce-list@redhat.com",
    },
    actions: {
      trash: true,
      neverImportant: true,
    },
  },
  {
    criteria: { query: '"your mojo newsletter" from:mojo-notify@redhat.com' },
    actions: {
      trash: true,
      neverImportant: true,
    },
  },
  {
    criteria: { query: 'list:"rsyslog@lists.adiscon.com"' },
    actions: {
      labels: ["list/rsyslog", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"eng-common-logging@redhat.com"' },
    actions: {
      labels: ["list/redhat/eng-common-logging", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: {
      query:
        '{list:"rh-moc-openstack@redhat.com" list:"redhat-moc@lists.massopen.cloud"}',
    },
    actions: {
      labels: ["list/redhat/moc", "!expireafter/30d"],
    },
  },
  {
    criteria: { query: 'list:"puppet-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/puppet", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"usa-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/usa-list", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openshift-sme@redhat.com"' },
    actions: {
      labels: ["list/redhat/openshift-sme", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: {
      subject: "Uncaught bounce notification",
      query: "list:(redhat-moc-baremetal.redhat.com)",
    },
    actions: {
      trash: true,
    },
  },
  {
    criteria: { query: "adobesign@echosign.com" },
    actions: {
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rhelai-devel@redhat.com"' },
    actions: {
      labels: ["list/redhat/rhelai-devel", "!expireafter/30d"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: {
      query:
        'from:(help@nerc.mghpcc.org OR help@nese.mghpcc.org) subject:"Ticket Alert"',
    },
    actions: {
      trash: true,
    },
  },
  {
    criteria: {
      query:
        "from:(president@bu.edu OR sumlab@bu.edu OR bwell@bu.edu OR provost@bu.edu OR research@bu.edu OR livingourvalues@bu.edu OR bussw@bu.edu OR excellence@bu.edu OR sustainability@bu.edu)",
    },
    actions: {
      trash: true,
    },
  },
];

// Iterate through our filter definitions and built gmail filter
// api objects. Expand hierarchical labels (list/foo/bar).
function _buildFilterResources(labelMap) {
  const resources = [];

  for (const filter of FILTERS) {
    const removeLabelIds = [];
    if (filter.actions.archive) removeLabelIds.push("INBOX");
    if (filter.actions.neverSpam) removeLabelIds.push("SPAM");
    if (filter.actions.neverImportant) removeLabelIds.push("IMPORTANT");

    const systemLabelIds = [];
    if (filter.actions.trash) systemLabelIds.push("TRASH");
    if (filter.actions.star) systemLabelIds.push("STARRED");
    if (filter.actions.alwaysImportant) systemLabelIds.push("IMPORTANT");

    const userLabelNames = filter.actions.labels
      ? _expandLabelHierarchy(filter.actions.labels)
      : [];

    if (userLabelNames.length === 0) {
      const action = {};
      if (systemLabelIds.length > 0) action.addLabelIds = systemLabelIds;
      if (removeLabelIds.length > 0) action.removeLabelIds = removeLabelIds;
      resources.push({ criteria: filter.criteria, action: action });
    } else {
      for (const name of userLabelNames) {
        const addLabelIds = [labelMap[name], ...systemLabelIds];
        const action = { addLabelIds: addLabelIds };
        if (removeLabelIds.length > 0) action.removeLabelIds = removeLabelIds;
        resources.push({ criteria: filter.criteria, action: action });
      }
    }
  }

  return resources;
}

// Generate a comparable representation of a filter that we can use to
// determine if a filter exists or not.
function _normalizeObject(obj) {
  const result = {};
  for (const key of Object.keys(obj).sort()) {
    const val = obj[key];

    // Drop "empty" values.
    if (val === undefined || val === null || val === "") continue;
    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      result[key] = val.slice().sort();
    } else {
      result[key] = val;
    }
  }
  return result;
}

function _fingerprintFilter(resource) {
  // We eliminiate any keys not listed in criteriaKeys
  const criteriaKeys = [
    "from",
    "to",
    "subject",
    "query",
    "negatedQuery",
    "hasAttachment",
    "excludeChats",
    "size",
    "sizeComparison",
  ];
  const actionKeys = ["addLabelIds", "removeLabelIds", "forward"];

  const criteria = {};
  for (const key of criteriaKeys) {
    if (resource.criteria[key] !== undefined) {
      criteria[key] = resource.criteria[key];
    }
  }

  const action = {};
  for (const key of actionKeys) {
    if (resource.action[key] !== undefined) {
      action[key] = resource.action[key];
    }
  }

  return JSON.stringify({
    criteria: _normalizeObject(criteria),
    action: _normalizeObject(action),
  });
}

// Ensure that all labels referenced in filters exist in gmail.
function _ensureLabelsExist() {
  for (const filter of FILTERS) {
    if (filter.actions.labels) {
      _getOrCreateLabels(_expandLabelHierarchy(filter.actions.labels));
    }
  }
}

function createAllFilters() {
  _ensureLabelsExist();
  const labelMap = _buildLabelMap();
  const resources = _buildFilterResources(labelMap);

  let created = 0;
  for (const resource of resources) {
    try {
      _createFilterWithRetry(resource);
      created++;
    } catch (e) {
      console.log(`Failed to create filter: ${JSON.stringify(resource)}`);
      throw e;
    }
  }

  console.log(`Created ${created} filters`);
}

function deleteAllFilters() {
  const filters = Gmail.Users.Settings.Filters.list("me").filter || [];
  for (const filter of filters) {
    _deleteFilterWithRetry(filter.id);
  }
  console.log(`Deleted ${filters.length} filters`);
}

function syncFilters() {
  _ensureLabelsExist();

  const labelMap = _buildLabelMap();
  const desired = _buildFilterResources(labelMap);
  const existing = Gmail.Users.Settings.Filters.list("me").filter || [];

  const desiredByFingerprint = new Map();
  for (const resource of desired) {
    desiredByFingerprint.set(_fingerprintFilter(resource), resource);
  }

  const existingByFingerprint = new Map();
  for (const filter of existing) {
    existingByFingerprint.set(_fingerprintFilter(filter), filter);
  }

  let deleted = 0;
  console.log("Deleting filters not in configuration");
  for (const [key, filter] of existingByFingerprint) {
    if (!desiredByFingerprint.has(key)) {
      _deleteFilterWithRetry(filter.id);
      deleted++;
    }
  }

  let created = 0;
  console.log("Creating filters not in Gmail");
  for (const [key, resource] of desiredByFingerprint) {
    if (!existingByFingerprint.has(key)) {
      try {
        _createFilterWithRetry(resource);
        created++;
      } catch (e) {
        throw new Error(
          `Failed to create filter: ${e.message}\n${JSON.stringify(resource)}`,
          { cause: e },
        );
      }
    }
  }

  console.log(
    `Sync complete: created ${created}, deleted ${deleted}, unchanged ${desired.length - created}`,
  );
}
