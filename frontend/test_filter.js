function filterFolders(folders, searchQuery, departmentFilter) {
  return folders.filter(f => {
    const matchesSearch = !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      !departmentFilter ||
      departmentFilter === 'All Departments' ||
      f.department === 'All Departments' ||
      f.department === departmentFilter;

    return matchesSearch && matchesDept;
  });
}

const folders = [
  {
    "id": "cmmlvps09000004i96t0602hg",
    "name": "All the projects",
    "type": "folder",
    "department": "All Departments",
    "driveLink": "https://drive.google.com/...",
    "parentId": null,
    "customColor": "#3b82f6",
    "createdById": "cmmhsoge9000004icd675k3of",
    "createdAt": "2026-03-11T10:11:21.993Z",
    "updatedAt": "2026-03-11T10:11:21.993Z"
  }
];

const result = filterFolders(folders, "", "Website Developers");
console.log('Resulting Folders:', result.length);
