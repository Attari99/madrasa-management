import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db, logActivity } from "../../utils/storage";
import type { Student, Class, Ustad } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const schema = z.object({
  studentName: z.string().min(2, "Student name is required"),
  fatherName: z.string().min(2, "Father name is required"),
  guardianNumber: z.string().min(7, "Guardian number is required"),
  address: z.string().min(5, "Address is required"),
  age: z.coerce.number().min(4, "Age must be at least 4").max(30, "Age must be reasonable"),
  admissionDate: z.string().min(1, "Admission date is required"),
  currentClass: z.string().min(1, "Class is required"),
  assignedTeacher: z.string(),
  status: z.enum(["active", "inactive"]),
});

type FormData = z.infer<typeof schema>;
interface Props { id?: string }

export default function StudentForm({ id }: Props) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isEdit = !!id;
  const classes = db.getAll<Class>("classes");
  const ustads = db.getAll<Ustad>("ustads");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { studentName: "", fatherName: "", guardianNumber: "", address: "", age: 10, admissionDate: new Date().toISOString().split("T")[0], currentClass: "", assignedTeacher: "", status: "active" },
  });

  useEffect(() => {
    if (isEdit && id) {
      const student = db.getById<Student>("students", id);
      if (student) {
        Object.keys(student).forEach(key => { if (key in schema.shape) setValue(key as any, student[key as keyof Student]); });
      }
    }
  }, [id, isEdit, setValue]);

  const onSubmit = (data: FormData) => {
    if (isEdit && id) {
      db.update<Student>("students", id, data);
      logActivity("Updated student", "student", id, user?.id || "");
    } else {
      db.create<Student>("students", data as Omit<Student, "id">);
      logActivity("Added new student", "student", "", user?.id || "");
    }
    setLocation("/students");
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3"><button onClick={() => setLocation("/students")} className="p-2 hover:bg-accent rounded"><ArrowLeft className="w-4 h-4" /></button><div><h1 className="text-2xl font-bold">{isEdit ? "Edit Student" : "Add Student"}</h1><p className="text-sm text-muted-foreground">Fill in the student details below</p></div></div>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div><label className="text-sm font-medium">Student Name *</label><input {...register("studentName")} className="w-full px-3 py-2 border border-input rounded mt-1" />{errors.studentName && <p className="text-xs text-destructive mt-1">{errors.studentName.message}</p>}</div>
          <div><label className="text-sm font-medium">Father Name *</label><input {...register("fatherName")} className="w-full px-3 py-2 border border-input rounded mt-1" />{errors.fatherName && <p className="text-xs text-destructive mt-1">{errors.fatherName.message}</p>}</div>
          <div><label className="text-sm font-medium">Guardian Phone *</label><input {...register("guardianNumber")} className="w-full px-3 py-2 border border-input rounded mt-1" />{errors.guardianNumber && <p className="text-xs text-destructive mt-1">{errors.guardianNumber.message}</p>}</div>
          <div><label className="text-sm font-medium">Age *</label><input type="number" {...register("age")} className="w-full px-3 py-2 border border-input rounded mt-1" />{errors.age && <p className="text-xs text-destructive mt-1">{errors.age.message}</p>}</div>
          <div><label className="text-sm font-medium">Admission Date *</label><input type="date" {...register("admissionDate")} className="w-full px-3 py-2 border border-input rounded mt-1" />{errors.admissionDate && <p className="text-xs text-destructive mt-1">{errors.admissionDate.message}</p>}</div>
          <div><label className="text-sm font-medium">Current Class *</label><select value={watch("currentClass")} onChange={e => setValue("currentClass", e.target.value)} className="w-full px-3 py-2 border border-input rounded mt-1"><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}</select>{errors.currentClass && <p className="text-xs text-destructive mt-1">{errors.currentClass.message}</p>}</div>
          <div><label className="text-sm font-medium">Assigned Teacher</label><select value={watch("assignedTeacher")} onChange={e => setValue("assignedTeacher", e.target.value)} className="w-full px-3 py-2 border border-input rounded mt-1"><option value="">None</option>{ustads.filter(u=>u.status==="active").map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></div>
          <div><label className="text-sm font-medium">Status</label><select value={watch("status")} onChange={e => setValue("status", e.target.value as "active"|"inactive")} className="w-full px-3 py-2 border border-input rounded mt-1"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </div>
        <div><label className="text-sm font-medium">Address *</label><textarea {...register("address")} rows={2} className="w-full px-3 py-2 border border-input rounded mt-1" />{errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}</div>
        <div className="flex gap-3"><button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2"><Save className="w-4 h-4" />{isEdit ? "Update Student" : "Add Student"}</button><button type="button" onClick={()=>setLocation("/students")} className="px-4 py-2 border border-input rounded">Cancel</button></div>
      </form>
    </div>
  );
}