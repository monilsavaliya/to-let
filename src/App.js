import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, Timestamp 
} from "firebase/firestore";
// 🔴 CHANGE 1: Removed 'firebase/storage' imports
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { 
  LayoutDashboard, Plus, Database, Eye, EyeOff, Edit2, Trash2, 
  ImageIcon, Save, X, UploadCloud, Loader2, Star, ShieldAlert,
  CheckCircle2, MapPin, DollarSign, Users, List, MinusCircle, Link as LinkIcon
} from 'lucide-react';

import { db, auth } from './firebase'; 

// ==========================================
// 🔴 CHANGE 2: YOUR CLOUDINARY KEYS (From Screenshot)
// ==========================================
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dvtye0dk9";
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "to-let";

// --- INITIAL STATE ---
const INITIAL_FORM_STATE = {
  title: '', location: 'Jia Sarai, Near IIT Gate', type: 'PG',
  price: '', marketPrice: '', phone: '',
  tenantType: 'Boys Only', capacity: 1,
  restrictions: 'No Smoking, No Drinking',
  amenities: 'WiFi, AC, RO Water',
  description: '', thumbnail: '', gallery: [], // CHANGED: gallery is now an array
  rating: 4.5, ratingCount: 10,
  // NEW LOCATION FIELDS
  googleMapsLink: '', 
  postalAddress: ''
};

// ==========================================
// COMPONENT 1: THE EDITOR
// ==========================================
function RoomEditor({ initialData, onCancel, onSave }) {
  const isEditing = !!initialData.id;
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(""); 
  
  const [formData, setFormData] = useState(() => {
    if (!isEditing) return { ...INITIAL_FORM_STATE };
    return {
      title: initialData.info?.title || '',
      location: initialData.info?.location || '', // Short location (e.g. Jia Sarai)
      type: initialData.info?.type || 'PG',
      price: initialData.price?.amount || '',
      marketPrice: initialData.price?.marketAmount || '',
      phone: initialData.contact?.phone || '',
      tenantType: initialData.rules?.tenantType || 'Boys Only',
      capacity: initialData.rules?.capacity || 1,
      restrictions: initialData.rules?.restrictions?.join(', ') || '',
      amenities: initialData.amenities?.join(', ') || '',
      description: initialData.description || '',
      thumbnail: initialData.media?.thumbnail || '',
      gallery: initialData.media?.gallery || [], 
      rating: initialData.rating?.average || 4.5,
      ratingCount: initialData.rating?.count || 0,
      // NEW FIELDS
      googleMapsLink: initialData.info?.googleMapsLink || '',
      postalAddress: initialData.info?.postalAddress || ''
    };
  });

  // 🔴 CHANGE 3: NEW UPLOAD LOGIC (Cloudinary)
  const handleUpload = async (e, type) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus(`Uploading to Cloudinary...`);
    
    const fileList = Array.from(files);
    
    for (const file of fileList) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        data.append("cloud_name", CLOUDINARY_CLOUD_NAME);

        try {
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: data
          });

          const uploadImage = await res.json();
          
          if(uploadImage.secure_url) {
             if (type === 'thumbnail') {
                 setFormData(prev => ({ ...prev, thumbnail: uploadImage.secure_url }));
             } else {
                 setFormData(prev => ({ ...prev, gallery: [...prev.gallery, uploadImage.secure_url] }));
             }
             setUploadStatus("✅ Success!");
          } else {
             console.error(uploadImage);
             throw new Error("Cloudinary rejected the file");
          }

        } catch (err) {
          console.error(err);
          setUploadStatus("❌ Failed.");
          alert("Upload Failed. Check console for details.");
        }
    }
    setTimeout(() => setUploadStatus(""), 3000);
  };

  const removeGalleryImage = (indexToRemove) => {
      setFormData(prev => ({
          ...prev,
          gallery: prev.gallery.filter((_, index) => index !== indexToRemove)
      }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      info: { 
          title: formData.title, 
          location: formData.location, 
          type: formData.type,
          // Save new location fields inside 'info' object
          googleMapsLink: formData.googleMapsLink,
          postalAddress: formData.postalAddress
      },
      price: { amount: Number(formData.price), marketAmount: Number(formData.marketPrice) },
      media: { thumbnail: formData.thumbnail, gallery: formData.gallery },
      rules: { 
        tenantType: formData.tenantType, 
        capacity: Number(formData.capacity), 
        restrictions: formData.restrictions.toString().split(',').map(s=>s.trim()).filter(Boolean) 
      },
      amenities: formData.amenities.toString().split(',').map(s=>s.trim()).filter(Boolean),
      contact: { phone: formData.phone },
      rating: { average: Number(formData.rating), count: Number(formData.ratingCount) },
      description: formData.description,
      status: initialData.status || 'available',
      createdAt: initialData.createdAt || Timestamp.now()
    };

    try {
      if (isEditing) await updateDoc(doc(db, "properties", initialData.id), payload);
      else await addDoc(collection(db, "properties"), payload);
      onSave();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-w-4xl mx-auto my-8">
      <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {isEditing ? <Edit2 size={24}/> : <Plus size={24}/>} 
            {isEditing ? 'Edit Property Details' : 'Add New Property'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Control Panel: Manage details & photos</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-full transition"><X size={24}/></button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Property Title</label>
             <input required className="w-full border-2 border-slate-200 p-3 rounded-lg text-lg font-medium focus:border-rose-500 outline-none" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
          </div>
          
          {/* NEW LOCATION SECTION */}
          <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <MapPin size={16} /> Precise Location Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Area (Short)</label>
                     <input required className="w-full border-2 border-white p-3 rounded-lg outline-none" placeholder="e.g. Jia Sarai, Near IIT" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Google Maps Link</label>
                     <div className="flex items-center border-2 border-white bg-white rounded-lg px-3">
                        <LinkIcon size={16} className="text-slate-400 mr-2"/>
                        <input className="w-full p-3 outline-none bg-transparent" placeholder="https://maps.app.goo.gl/..." value={formData.googleMapsLink} onChange={e=>setFormData({...formData, googleMapsLink: e.target.value})} />
                     </div>
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Postal Address</label>
                     <textarea className="w-full border-2 border-white p-3 rounded-lg h-20 resize-none outline-none" placeholder="House No, Floor, Street, Landmark, Pin Code" value={formData.postalAddress} onChange={e=>setFormData({...formData, postalAddress: e.target.value})} />
                  </div>
              </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
             <select className="w-full border-2 border-slate-200 p-3 rounded-lg bg-white" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}>
               <option>PG</option><option>Room</option><option>Flat</option>
             </select>
          </div>
        </div>

        {/* PHOTOS SECTION */}
        <div className="bg-indigo-50 p-6 rounded-xl border-2 border-dashed border-indigo-200">
           <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
             <UploadCloud size={18} /> Photos (Cloudinary Hosting)
             {uploadStatus && <span className="ml-auto text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full animate-pulse">{uploadStatus}</span>}
           </h3>
           
           <div className="space-y-6">
             {/* Thumbnail */}
             <div className="flex items-start gap-4">
               <div className="w-24 h-24 bg-white rounded-lg border-2 flex items-center justify-center overflow-hidden shrink-0 relative">
                 {formData.thumbnail ? <img src={formData.thumbnail} className="w-full h-full object-cover" alt="thumb"/> : <ImageIcon className="text-slate-300 h-8 w-8"/>}
               </div>
               <div>
                 <p className="text-xs font-bold text-slate-500 mb-1">Main Thumbnail</p>
                 <input type="file" onChange={(e) => handleUpload(e, 'thumbnail')} className="text-xs file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" />
                 <p className="text-[10px] text-slate-400 mt-2">Required. Shows on the card.</p>
               </div>
             </div>

             <div className="h-px bg-indigo-200 w-full"></div>

             {/* Gallery */}
             <div>
               <div className="flex justify-between items-center mb-2">
                   <p className="text-xs font-bold text-slate-500">Gallery Images ({formData.gallery.length})</p>
                   {/* Input for adding more images */}
                   <label className="cursor-pointer bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full hover:bg-indigo-700 transition flex items-center gap-1">
                       <Plus size={14}/> Add Images
                       <input type="file" multiple onChange={(e) => handleUpload(e, 'gallery')} className="hidden" />
                   </label>
               </div>
               
               {/* Gallery Grid */}
               <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                   {formData.gallery.map((imgUrl, index) => (
                       <div key={index} className="relative aspect-square bg-white rounded-lg border overflow-hidden group">
                           <img src={imgUrl} className="w-full h-full object-cover" alt={`gallery-${index}`} />
                           <button 
                               type="button"
                               onClick={() => removeGalleryImage(index)}
                               className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                               title="Remove Image"
                           >
                               <X size={12} />
                           </button>
                       </div>
                   ))}
                   {formData.gallery.length === 0 && (
                       <div className="col-span-3 text-xs text-slate-400 italic py-4">No gallery images uploaded yet.</div>
                   )}
               </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Monthly Rent (₹)</label>
              <div className="flex items-center border-2 border-slate-200 rounded-lg px-3">
                <span className="text-slate-400 font-bold">₹</span>
                <input required type="number" className="w-full p-3 outline-none font-bold text-slate-800" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} />
              </div>
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rating (1-5)</label>
              <input type="number" step="0.1" max="5" className="w-full border-2 border-slate-200 p-3 rounded-lg" value={formData.rating} onChange={e=>setFormData({...formData, rating: e.target.value})} />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Review Count</label>
              <input type="number" className="w-full border-2 border-slate-200 p-3 rounded-lg" value={formData.ratingCount} onChange={e=>setFormData({...formData, ratingCount: e.target.value})} />
           </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100">
           <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><ShieldAlert size={18}/> House Rules & Amenities</h3>
           <div className="grid grid-cols-2 gap-6">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tenant Type</label>
                 <select className="w-full border-2 border-slate-200 p-3 rounded-lg bg-white" value={formData.tenantType} onChange={e=>setFormData({...formData, tenantType: e.target.value})}>
                   <option>Boys Only</option><option>Girls Only</option><option>Family</option><option>Any</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Capacity</label>
                 <input type="number" className="w-full border-2 border-slate-200 p-3 rounded-lg" value={formData.capacity} onChange={e=>setFormData({...formData, capacity: e.target.value})} />
              </div>
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amenities</label>
              <input className="w-full border-2 border-slate-200 p-3 rounded-lg" placeholder="WiFi, AC, Geyser..." value={formData.amenities} onChange={e=>setFormData({...formData, amenities: e.target.value})} />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Restrictions</label>
              <input className="w-full border-2 border-slate-200 p-3 rounded-lg" placeholder="No Drinking..." value={formData.restrictions} onChange={e=>setFormData({...formData, restrictions: e.target.value})} />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Owner Phone</label>
              <input required className="w-full border-2 border-slate-200 p-3 rounded-lg" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Description</label>
              <textarea className="w-full border-2 border-slate-200 p-3 rounded-lg h-32 resize-none" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
           </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-6 py-3 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition">Cancel</button>
          <button type="submit" disabled={loading} className="px-8 py-3 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
            {loading ? 'Saving...' : 'Publish Property'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// COMPONENT 2: THE DASHBOARD (Inventory)
// ==========================================
function Dashboard({ onAdd, onEdit }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { if (!u) signInAnonymously(auth); });
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsubData = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => { unsubAuth(); unsubData(); };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ Are you sure? This cannot be undone.")) return;
    try { await deleteDoc(doc(db, "properties", id)); } catch (e) { alert(e); }
  };

  const handleToggle = async (room) => {
    const newStatus = room.status === 'booked' ? 'available' : 'booked';
    await updateDoc(doc(db, "properties", room.id), { status: newStatus });
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-rose-500" />
          <div><h1 className="text-xl font-bold">Admin Panel</h1><p className="text-[10px] text-slate-400">Jia Sarai Management System</p></div>
        </div>
        <div className="bg-slate-800 px-3 py-1 rounded text-xs font-mono">{rooms.length} Units</div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex justify-between items-end mb-6">
          <div><h2 className="text-2xl font-bold text-slate-800">Property Inventory</h2><p className="text-slate-500 text-sm">Manage listings, edit details, and track status.</p></div>
          <button onClick={onAdd} className="bg-rose-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition flex items-center gap-2"><Plus size={20}/> Add New Room</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => (
            <div key={room.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${room.status === 'booked' ? 'border-slate-200 opacity-75' : 'border-slate-200'}`}>
              <div className="relative h-48 bg-slate-200 group cursor-pointer" onClick={() => onEdit(room)}>
                {room.media?.thumbnail ? <img src={room.media.thumbnail} alt="" className={`w-full h-full object-cover transition ${room.status === 'booked' ? 'grayscale' : ''}`} /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={32}/></div>}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${room.status === 'booked' ? 'bg-slate-800 text-white' : 'bg-green-500 text-white shadow-sm'}`}>{room.status === 'booked' ? 'Sold Out' : 'Live'}</div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"><span className="text-white font-bold border-2 border-white px-4 py-2 rounded-lg flex items-center gap-2"><Edit2 size={16}/> Edit Details</span></div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-slate-900 line-clamp-1 text-lg">{room.info?.title}</h3></div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4"><MapPin size={14}/> {room.info?.location}</div>
                <div className="flex gap-2 mb-4">
                  <div className="bg-slate-50 px-2 py-1 rounded text-xs font-bold text-slate-600 flex items-center gap-1 border border-slate-200"><DollarSign size={12}/> {room.price?.amount}</div>
                  <div className="bg-slate-50 px-2 py-1 rounded text-xs font-bold text-slate-600 flex items-center gap-1 border border-slate-200"><Users size={12}/> {room.rules?.tenantType}</div>
                  <div className="bg-slate-50 px-2 py-1 rounded text-xs font-bold text-slate-600 flex items-center gap-1 border border-slate-200 ml-auto"><Star size={12} className="text-orange-400 fill-orange-400"/> {room.rating?.average || 4.5}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => handleToggle(room)} className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${room.status === 'booked' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{room.status === 'booked' ? <Eye size={14}/> : <EyeOff size={14}/>} {room.status === 'booked' ? 'Activate' : 'Mark Sold'}</button>
                  <button onClick={() => handleDelete(room.id)} className="py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-2"><Trash2 size={14}/> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MASTER APP
// ==========================================
export default function App() {
  const [editingRoom, setEditingRoom] = useState(null); 
  return (
    <>
      {editingRoom ? (
        <RoomEditor initialData={editingRoom} onCancel={() => setEditingRoom(null)} onSave={() => setEditingRoom(null)} />
      ) : (
        <Dashboard onAdd={() => setEditingRoom({})} onEdit={(room) => setEditingRoom(room)} />
      )}
    </>
  );
}
