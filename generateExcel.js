const xlsx = require('xlsx');

const data = [
  ['username', 'email'],
  ['user01', 'user01@example.com'],
  ['user02', 'user02@example.com'],
  ['user03', 'user03@example.com'],
  ['user04', 'user04@example.com'],
  ['user05', 'user05@example.com'],
];

const ws = xlsx.utils.aoa_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Users');

xlsx.writeFile(wb, 'user.xlsx');
console.log('Sample user.xlsx created.');
