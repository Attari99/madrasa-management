import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db, logActivity } from "../../utils/storage";
import type { Ustad, Class, User } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  fatherName: z.string().min(2, "Father name is required"),
  phone: z.string().min(7, "Phone number is required"),
  cnic: z.string().min(10, "CNIC is required"),
  address: z.string().min(5, "Address is required"),
  qualification: z.string().min(2, "Qualification is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  assignedClass: z.string(),
  experience: z.string(),
  status: z.enum(["active", "inactive"]),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;
interface Props { id?: string }

export default function UstadForm({ id }: Props) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isEdit = !!id;
  const [showPassword, setShowPassword] = useState(false);
  const classes = db.getAll<Class>("classes");
  const users = db.getAll<User>("users");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { 
      fullName: "", fatherName: "", phone: "", cnic: "", address: "", 
      qualification: "", joiningDate: new Date().toISOString().split("T")[0], 
      assignedClass: "", experience: "", status: "active",
      email: "", password: "ustad123"
    },
  });

  useEffect(() => {
    if (isEdit && id) {
      const ustad = db.getById<Ustad>("ustads", id);
      if (ustad) {
        setValue("fullName", ustad.fullName || "");
        setValue("fatherName", ustad.fatherName || "");
        setValue("phone", ustad.phone || "");
        setValue("cnic", ustad.cnic || "");
        setValue("address", ustad.address || "");
        setValue("qualification", ustad.qualification || "");
        setValue("joiningDate", ustad.joiningDate || "");
        setValue("assignedClass", ustad.assignedClass || "");
        setValue("experience", ustad.experience || "");
        setValue("status", ustad.status || "active");
        setValue("email", ustad.email || "");
      }
      const userRecord = users.find(u => u.ustadId === id);
      if (userRecord) {
        setValue("email", userRecord.email || "");
        setValue("password", userRecord.password || "");
      }
    }
  }, [id, isEdit, setValue, users]);

  const onSubmit = (data: FormData) => {
    if (isEdit && id) { 
      // Update Ustad
      db.update<Ustad>("ustads", id, {
        fullName: data.fullName,
        fatherName: data.fatherName,
        phone: data.phone,
        cnic: data.cnic,
        address: data.address,
        qualification: data.qualification,
        joiningDate: data.joiningDate,
        assignedClass: data.assignedClass,
        experience: data.experience,
        status: data.status,
        email: data.email,
      });
      
      // Update User credentials
      const existingUser = users.find(u => u.ustadId === id);
      if (existingUser) {
        db.update<User>("users", existingUser.id, {
          username: data.email,
          email: data.email,
          password: data.password,
          name: data.fullName,
        });
        
        // Agar current logged in user hai to update karein
        if (user?.id === existingUser.id) {
          const currentUser = storage.get<User>("currentUser");
          if (currentUser) {
            storage.set("currentUser", { ...currentUser, email: data.email, password: data.password, name: data.fullName });
          }
        }
      }
      
      logActivity("Updated ustad", "ustad", id, user?.id || ""); 
      alert("Ustad updated successfully!");
    } else { 
      // Create new Ustad
      const newUstad = db.create<Ustad>("ustads", {
        fullName: data.fullName,
        fatherName: data.fatherName,
        phone: data.phone,
        cnic: data.cnic,
        address: data.address,
        qualification: data.qualification,
        joiningDate: data.joiningDate,
        assignedClass: data.assignedClass,
        experience: data.experience,
        status: data.status,
        email: data.email,
      });
      
      // Create User account for Ustad
      db.create<User>("users", {
        username: data.email,
        email: data.email,
        password: data.password,
        role: "ustad",
        name: data.fullName,
        ustadId: newUstad.id,
      });
      
      logActivity("Added new ustad", "ustad", newUstad.id, user?.id || ""); 
      alert("New ustad added successfully!");
    }
    setLocation("/ustads");
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={()=>setLocation("/ustads")} className="p-2 hover:bg-accent rounded">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Ustad" : "Add Ustad"}</h1>
          <p className="text-sm text-muted-foreground">Fill in the ustad details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div><label>Full Name *</label><input {...register("fullName")} className="w-full px-3 py-2 border rounded mt-1" />{errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}</div>
          <div><label>Father Name *</label><input {...register("fatherName")} className="w-full px-3 py-2 border rounded mt-1" />{errors.fatherName && <p className="text-xs text-destructive">{errors.fatherName.message}</p>}</div>
          <div><label>Phone *</label><input {...register("phone")} className="w-full px-3 py-2 border rounded mt-1" />{errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}</div>
          <div><label>CNIC *</label><input {...register("cnic")} className="w-full px-3 py-2 border rounded mt-1" />{errors.cnic && <p className="text-xs text-destructive">{errors.cnic.message}</p>}</div>
          <div><label>Email *</label><input type="email" {...register("email")} className="w-full px-3 py-2 border rounded mt-1" placeholder="ustad@example.com" />{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div>
          <div>
            <label>Password *</label>
            <div className="relative mt-1">
              <input type={showPassword ? "text" : "password"} {...register("password")} className="w-full px-3 py-2 border rounded pr-10" placeholder="••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div><label>Qualification *</label><input {...register("qualification")} className="w-full px-3 py-2 border rounded mt-1" />{errors.qualification && <p className="text-xs text-destructive">{errors.qualification.message}</p>}</div>
          <div><label>Joining Date *</label><input type="date" {...register("joiningDate")} className="w-full px-3 py-2 border rounded mt-1" />{errors.joiningDate && <p className="text-xs text-destructive">{errors.joiningDate.message}</p>}</div>
          <div><label>Assigned Class</label><select value={watch("assignedClass")} onChange={e=>setValue("assignedClass", e.target.value)} className="w-full px-3 py-2 border rounded mt-1"><option value="">None</option>{classes.map(c=><option key={c.id} value={c.id}>{c.className}</option>)}</select></div>
          <div><label>Experience</label><input {...register("experience")} placeholder="e.g., 5 years" className="w-full px-3 py-2 border rounded mt-1" /></div>
          <div><label>Status</label><select value={watch("status")} onChange={e=>setValue("status", e.target.value as "active"|"inactive")} className="w-full px-3 py-2 border rounded mt-1"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </div>
        <div><label>Address *</label><textarea {...register("address")} rows={2} className="w-full px-3 py-2 border rounded mt-1" />{errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}</div>
        <div className="flex gap-3">
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded flex items-center gap-2"><Save className="w-4 h-4" />{isEdit ? "Update Ustad" : "Add Ustad"}</button>
          <button type="button" onClick={()=>setLocation("/ustads")} className="px-4 py-2 border rounded">Cancel</button>
        </div>
      </form>
    </div>
  );
}