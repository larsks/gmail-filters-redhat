const FILTERS = [
  {
    criteria: {
      query:
        "{larsks lkellogg kellogg-stedman lars@redhat.com} AND -to:me AND -{has:attachment filename:invite.ics}",
    },
    actions: {
      labels: ["mentions"],
    },
  },
  {
    criteria: { query: 'list:"devel@lists.fedoraproject.org"' },
    actions: {
      labels: ["list/fedora/devel"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"cloud@lists.fedoraproject.org"' },
    actions: {
      labels: ["list/fedora/cloud"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"users@lists.fedoraproject.org"' },
    actions: {
      labels: ["list/fedora/users"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"outage-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/outage"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rh-openstack-dev@redhat.com"' },
    actions: {
      labels: ["list/redhat/rhos-dev"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"ansible-devel@googlegroups.com"' },
    actions: {
      labels: ["list/ansible/ansible-devel"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"ansible-project@googlegroups.com"' },
    actions: {
      labels: ["list/ansible/ansible-project"],
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
    criteria: { from: "bugzilla@redhat.com" },
    actions: {
      labels: ["bug/redhat"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"prod-dept@redhat.com"' },
    actions: {
      labels: ["list/redhat/prod-dept"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack@lists.openstack.org"' },
    actions: {
      labels: ["list/openstack/users"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-discuss@lists.openstack.org"' },
    actions: {
      labels: ["list/openstack/discuss"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"users@lists.libvirt.org"' },
    actions: {
      labels: ["list/libvirt-users"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"devel@lists.libvirt.org"' },
    actions: {
      labels: ["list/libvirt-devel"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rhos-tech@redhat.com"' },
    actions: {
      labels: ["list/redhat/rhos-tech"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rhos-prio-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/rhos-prio"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-dev@lists.openstack.org"' },
    actions: {
      labels: ["list/openstack/openstack-dev"],
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
      labels: ["list/redhat/cloud-strategy"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"os-devel-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/os-devel"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-program@redhat.com"' },
    actions: {
      labels: ["list/redhat/openstack-program"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"systemd-devel@lists.freedesktop.org"' },
    actions: {
      labels: ["list/systemd-devel"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-status@redhat.com"' },
    actions: {
      labels: ["list/redhat/openstack-status"],
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
      labels: ["list/linux/kernel"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openstack-operators@lists.openstack.org"' },
    actions: {
      labels: ["list/openstack/openstack-operators"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"users@clusterlabs.org"' },
    actions: {
      labels: ["list/pacemaker-users"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"users@lists.rdoproject.org"' },
    actions: {
      labels: ["list/rdo/users"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"dev@lists.rdoproject.org"' },
    actions: {
      labels: ["list/rdo/dev"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rdo-list@redhat.com"' },
    actions: {
      labels: ["list/rdo-list"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"cloud-dept-status@redhat.com"' },
    actions: {
      labels: ["list/redhat/cloud-dept-status"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"python-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/python"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"atomic-devel@projectatomic.io"' },
    actions: {
      labels: ["list/atomic-devel"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"centos-devel@centos.org"' },
    actions: {
      labels: ["list/centos-devel"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"friday-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/friday-list"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"atomic@projectatomic.io"' },
    actions: {
      labels: ["list/atomic"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"rh-ms-azure-users@redhat.com"' },
    actions: {
      labels: ["list/redhat/rh-ms-azure-users"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: "{docker container kubernetes lxc runc}" },
    actions: {
      labels: ["containers"],
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
      labels: ["list/rsyslog"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"eng-common-logging@redhat.com"' },
    actions: {
      labels: ["list/redhat/eng-common-logging"],
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
      labels: ["list/redhat/moc"],
    },
  },
  {
    criteria: { query: 'list:"puppet-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/puppet"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"usa-list@redhat.com"' },
    actions: {
      labels: ["list/redhat/usa-list"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: { query: 'list:"openshift-sme@redhat.com"' },
    actions: {
      labels: ["list/redhat/openshift-sme"],
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
      labels: ["list/redhat/rhelai-devel"],
      archive: true,
      neverSpam: true,
    },
  },
  {
    criteria: {
      from: "help@(nerc OR nese).mghpcc.org",
      subject: "Ticket Alert",
    },
    actions: {
      trash: true,
    },
  },
];

function _expandLabelHierarchy(labels) {
  const expanded = [];
  const seen = {};
  for (const label of labels) {
    const parts = label.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join("/");
      if (!seen[path]) {
        seen[path] = true;
        expanded.push(path);
      }
    }
  }
  return expanded;
}

function _createAllFilters() {
  for (const filter of FILTERS) {
    if (filter.actions.labels) {
      _getOrCreateLabels(_expandLabelHierarchy(filter.actions.labels));
    }
  }

  const labelMap = {};
  for (const label of Gmail.Users.Labels.list("me").labels) {
    labelMap[label.name] = label.id;
  }

  let created = 0;
  for (const filter of FILTERS) {
    const removeLabelIds = [];
    if (filter.actions.archive) removeLabelIds.push("INBOX");
    if (filter.actions.neverSpam) removeLabelIds.push("SPAM");
    if (filter.actions.neverImportant) removeLabelIds.push("IMPORTANT");

    const systemLabelIds = [];
    if (filter.actions.trash) systemLabelIds.push("TRASH");
    if (filter.actions.star) systemLabelIds.push("STARRED");

    const userLabelNames = filter.actions.labels
      ? _expandLabelHierarchy(filter.actions.labels)
      : [];

    const resources = [];
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

    for (const resource of resources) {
      try {
        Gmail.Users.Settings.Filters.create(resource, "me");
        created++;
      } catch (e) {
        Logger.log(`Failed to create filter: ${JSON.stringify(resource)}`);
        throw e;
      }
    }
  }

  Logger.log(`Created ${created} filters`);
}

function _deleteAllFilters() {
  const filters = Gmail.Users.Settings.Filters.list("me").filter || [];
  for (const filter of filters) {
    Gmail.Users.Settings.Filters.remove("me", filter.id);
  }
  Logger.log(`Deleted ${filters.length} filters`);
}

function _syncFilters() {
  _deleteAllFilters();
  _createAllFilters();
}
