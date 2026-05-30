import { storage, generateId } from "./storage";
import type { User, Ustad, Student, Class, StudentAttendance, UstadAttendance, MonthlyProgress } from "./storage";

const today = new Date().toISOString().split("T")[0];

export const seedIfNeeded = () => {
  if (storage.get("seeded") === true) return;

  const users: User[] = [
    { id: generateId(), username: "admin@madrasa.com", email: "admin@madrasa.com", password: "admin123", role: "admin", name: "Maulana Muhammad Yusuf" },
    { id: generateId(), username: "ustad1@madrasa.com", email: "ustad1@madrasa.com", password: "ustad123", role: "ustad", name: "Hafiz Abdul Rahman", ustadId: "ustad_1" },
  ];
  storage.set("users", users);

  const ustads: Ustad[] = [
    { id: "ustad_1", fullName: "Hafiz Abdul Rahman", fatherName: "Haji Muhammad Akbar", phone: "0300-1234567", cnic: "35201-1234567-1", address: "Gulshan Iqbal, Karachi", qualification: "Hafiz-e-Quran, Dars-e-Nizami", joiningDate: "2020-01-15", assignedClass: "class_1", experience: "5 years", status: "active", email: "ustad1@madrasa.com" },
    { id: "ustad_2", fullName: "Qari Muhammad Bilal", fatherName: "Muhammad Ismail", phone: "0311-9876543", cnic: "35201-9876543-2", address: "North Nazimabad, Karachi", qualification: "Hafiz-e-Quran, Tajweed Expert", joiningDate: "2019-06-01", assignedClass: "class_2", experience: "7 years", status: "active", email: "ustad2@madrasa.com" },
    { id: "ustad_3", fullName: "Maulvi Saeed Ahmad", fatherName: "Ahmad Nawaz", phone: "0321-4567890", cnic: "35201-4567890-3", address: "Liaquatabad, Karachi", qualification: "Hafiz-e-Quran", joiningDate: "2021-03-10", assignedClass: "class_3", experience: "3 years", status: "active", email: "ustad3@madrasa.com" },
  ];
  storage.set("ustads", ustads);

  const classes: Class[] = [
    { id: "class_1", className: "Hifz Awwal", assignedTeacher: "ustad_1", transferHistory: [] },
    { id: "class_2", className: "Hifz Doum", assignedTeacher: "ustad_2", transferHistory: [] },
    { id: "class_3", className: "Nazirah", assignedTeacher: "ustad_3", transferHistory: [] },
  ];
  storage.set("classes", classes);

  const students: Student[] = [
    { id: "st_1", studentName: "Muhammad Abdullah", fatherName: "Abdul Ghafar", guardianNumber: "0300-1111111", address: "Gulshan, Karachi", age: 12, admissionDate: "2022-03-01", currentClass: "class_1", assignedTeacher: "ustad_1", status: "active" },
    { id: "st_2", studentName: "Ahmed Raza", fatherName: "Muhammad Raza", guardianNumber: "0301-2222222", address: "North Karachi", age: 11, admissionDate: "2022-04-01", currentClass: "class_1", assignedTeacher: "ustad_1", status: "active" },
    { id: "st_3", studentName: "Usman Tariq", fatherName: "Tariq Mehmood", guardianNumber: "0302-3333333", address: "SITE, Karachi", age: 13, admissionDate: "2021-09-10", currentClass: "class_1", assignedTeacher: "ustad_1", status: "active" },
    { id: "st_4", studentName: "Zaid Ali", fatherName: "Ali Asghar", guardianNumber: "0303-4444444", address: "Malir, Karachi", age: 10, admissionDate: "2023-01-15", currentClass: "class_2", assignedTeacher: "ustad_2", status: "active" },
    { id: "st_5", studentName: "Hamza Shah", fatherName: "Shah Faisal", guardianNumber: "0304-5555555", address: "Nazimabad, Karachi", age: 14, admissionDate: "2021-03-20", currentClass: "class_2", assignedTeacher: "ustad_2", status: "active" },
    { id: "st_6", studentName: "Ibrahim Khan", fatherName: "Khan Muhammad", guardianNumber: "0305-6666666", address: "Orangi, Karachi", age: 11, admissionDate: "2022-07-01", currentClass: "class_3", assignedTeacher: "ustad_3", status: "active" },
  ];
  storage.set("students", students);

  const studentAttendance: StudentAttendance[] = [];
  for (const sid of students.map(s => s.id)) {
    studentAttendance.push({ id: generateId(), studentId: sid, date: today, status: "present" });
  }
  storage.set("student_attendance", studentAttendance);

  storage.set("madrasa_settings", { name: "Madarsa Tul Madina Fatima Masjid", logo: null });
  storage.set("activity_logs", [{ id: generateId(), action: "System initialized", entity: "system", entityId: "0", userId: "system", timestamp: new Date().toISOString() }]);
  storage.set("seeded", true);
};