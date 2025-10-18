import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, serverTimestamp, setLogLevel } from 'firebase/firestore';
import { LogIn, ArrowRight, ArrowLeft, PlusCircle, XCircle, MapPin, CheckCircle, Sparkles, Mail, Phone } from 'lucide-react';
// Data is merged directly into this file to prevent file resolution errors.

// --- Global Context Variables (MUST be used as provided by the environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
// FIXED: Using the correct global variable name __initial_auth_token
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; 

// ==============================================================================
// --- DYNAMIC DATA INJECTED FROM UPLOADED CSV FILES (De-duplicated) ---
// ==============================================================================

const AllOrganizations = Array.from(new Set([ // De-duplicate the combined list
    // --- SECRETARIAT DEPARTMENTS ---
    "Agriculture and Marketing", "Animal Husbandry, Dairy Development and Fisheries", "Backward Classes Welfare",
    "Chief Ministers Office", "Chief Secretarys Office", "Environment, Forest, Science and Technology",
    "Human Resources (Higher Education)", "Energy", "Human Resources (School Education)",
    "Department of Economically Weaker Sections Welfare", "Consumer Affairs, Food and Civil Supplies", "Finance",
    "General Administration", "Governors Secretariat", "Gram Volunteers/Ward Volunteers and Village Secretariats /Ward Secretariats",
    "Health, Medical & Family Welfare", "Home", "Housing", "Water Resources", "Industries and Commerce",
    "Infrastructure and Investment", "Information Technology, Electronics and Communications",
    "Labour, Factories, Boilers & Insurance Medical Services", "Law", "Legislature",
    "Municipal Administration and Urban Development", "Minorities Welfare",
    
    // --- HEADS OF DEPARTMENTS (HOD) ---
    "Agriculture", "Horticulture", "Sericulture", "Marketing", "Cooperation and Cooperative Societies",
    "Animal Husbandry", "Fisheries", "BC Welfare", "Forest (PCCF)", "Technical Education",
    "Collegiate Education", "State Archives", "Intermediate Education", "Oriental Manscripts",
    "National Cadet Corps", "Electrical Safety", "State Ports", "Labour", "Factories",
    "Insurance Medical Services", "Boilers", "Prosecutions", "Municipal Administration",
    "Town and Country Planning", "Public Health Engineering", "AP State Minorities Commission", "Minorities Welfare", 
    "Economics and Statistics", "Panchayati Raj", "Panchayati Raj Engineering", "Rural Development",
    "Rural Water Supply Engineering", "Revenue (CCLA)", "Revenue (CTS)", 
    
    // --- AUTONOMOUS ORGANISATIONS (AO) ---
    "Agricultural Technology Management Agency (ATMA), Srikakulam", "Agricultural Technology Management Agency (ATMA), Vizianagaram", 
    "Agricultural Technology Management Agency (ATMA), Visakhapatnam", "Agricultural Technology Management Agency (ATMA), East Godavari",
    "Agricultural Technology Management Agency (ATMA), West Godavari", "Agricultural Technology Management Agency (ATMA), Krishna",
    "Agricultural Technology Management Agency (ATMA), Guntur", "Agricultural Technology Management Agency (ATMA), Prakasam",
    "Agricultural Technology Management Agency (ATMA), SPR Nellore", "Agricultural Technology Management Agency (ATMA), Chittoor",
    "Agricultural Technology Management Agency (ATMA), YSR Kadapa", "Agricultural Technology Management Agency (ATMA), Anantapuramu",
    "AP Study Circle", "AP State Commission for Scheduled Castes", "AP Tribal Welfare Residential Educational Institutions Society Gurukulam",
    "Girijan Cooperative Corporation Ltd", "AP Scheduled Tribes Cooperative Finance Corporation", 
    "Tribal Cultural Research and Training Mission", "AP STATE COMMISSION FOR SCHEDULED TRIBES",
    "AP Tribal Power Company Limited", "AP State Road Transport Corporation (APSRTC)", "AP Road Development Corporation",
    "State Transport Appellate Tribunal", "AP Womens Cooperative Development Corporation", 
    "AP Differently Abled, Senior Citizens Corporation", "AP State Womens Commission", "Andhra Pradesh State",

    // --- STATE UNITS (SU) ---
    "AP STATE NSS CELL", "Nodal Authority for e-Office and Biometric Attendance", "Special Enforcement Bureau",
    "Police-Intelligence", "Police-Home Guards", "Police-Grey Hounds", "Police-Organisation of Counter Terrorist Operations (OCTOPUS)",
    "Police-Coastal Security", "Police-Railways", "Police-Crime Investigation Department",
    "Police-Communication Organization", "Police-Training", "Police-Battalions", "Water Resources (E-in-C) Technical",
    "Water Resources-Minor Irrigation", "Water Resources-NTR Telugu Ganga Project, Tirupati",
    "Water Resources-Central Designs Organisation Vijayawada", "Water Resources-Inter State Water Resources",
    "Water Resources-Tenders", "Water Resources-Irrigation Projects, Kadapa", "Water Resources-Hydrology",
])).sort();

// --- LOCATION HIERARCHY (District, Mandal/Taluk, Village) ---
// This is the ONLY declaration of LocationHierarchy
const LocationHierarchy = {
    // Structure: District: { Taluk: [Village, Village, ...], ... }
    "Anantapuramu": {
        "Gooty": ["Utakallu"],
        "Guntakal": ["Sangala", "Kasapuram", "Konganapalle", "Sankarabanda"],
        "Singanamala": ["Singanamala"], 
    },
    "Parvathipuram Manyam": {
        "Pachipenta": ["Kottavalasa", "Kotikipenta"],
        "Makkuva": ["Papayyavalasa", "Chandrayyapeta"],
        "Salur": ["Mirtivalasa"],
    },
    "Vizianagaram": {
        "Bobbili": ["Bhojarajapuram"],
        "Jami": ["Jami"],
        "Vizinagaram": ["Vizinagaram"],
    },
    "Visakhapatnam": {
        "Bheemunipatnam": ["Bheemunipatnam"],
        "Gajuwaka": ["Gajuwaka"],
        "Madugula": ["Madugula"],
    },
    "Krishna": {
        "Mochilipatnam": ["Mochilipatnam"],
        "Gudivada": ["Gudivada"],
    },
    "Guntur": {
        "Tenali": ["Tenali"],
        "Mangalagiri": ["Mangalagiri"],
        "Guntur": ["Guntur"],
    },
};

const FullEquipmentList = Array.from(new Set([
    // --- SEARCH AND RESCUE ---
    "Gas Cutters", "Cold Cutters", "Bolt Cutters (Shears)", "Cutters- Hydraulic", "Cutters-Battery", 
    "Steel Cutter/Grinder", "Electric Drill", "Circular Saw with Diamond Blade(Electric)", "Chipping Hammer", 
    "Chain Saw-Diamond", "Chain Saw-Bullet", "Pneumatic Chisel", "Spreaders-Hydraulic", "Spreaders-Battery", 
    "Air Lifting bags (Different capacity)/Tools", "Jack with 5 ton lift", "Iron shod levers, 10 ft. Long",
    "Sledge hammer", "Heavy Axe", "Two handled cross cut-saw", "Chain tackle", "Single sheave snatch block",
    "Smoke Blower and Exhauster", "Set of rope tackle (3 sheave - 2 sheave)", "Gloves-Rubber, Tested up to 25, 000 volt",
    "Stretcher harness (set)", "Scaffold poles for sheer legs", "Jumping Cushions", "Rescue Rams", 
    "Glass remover (Punch Mark)", "Crescent/adjustable wrenches", "Slotted Screwdrivers", "Traps 4 X 4 meters",
    "Blankets", "Lifting tackle - 3 ton", "Chains 6 feet (3 ton lift)", "Aspects Blanket", "Soaking kit",
    "Shovel", "Spade", "Crow bar", "Heavy Block of Fulcrum", "Helmet", "Basket", "Pick axe", "Axe", 
    "Door breaker", "Hacksaw", "Knife Salvage", "Ceiling hook", "Public Address System", "Hand Tool Set", 
    "B.A.Set", "Rope", "Bucket", "Matok", "Hose/hose fitting", "Inflatable Light Tower", "Light Mast", 
    "Search light", "Electric Generator", "Electric Torch", "Lanterns", "Telescopic Pneumatic Mast (Light)",
    "Trucks Aerial Lift", "Bulldozers wheeled/chain", "Dumper", "Earth movers", "Cranes - Heavy Duty, Fork type", 
    "Tipper - Heavy Duty", "Recovery Vans Beam Type", "Snow Beaters Wheeled",
    "Search and Rescue Teams for Collapsed Structures (Skilled Resource)", "Search and Rescue Teams with canines (Skilled Resource)",

    // --- FLOOD RESCUE ---
    "Rescue back boards", "Diving suit", "Under water BA set", "Lifebuoy", "Life Jackets", 
    "Basket Stretcher", "Pneumatic Rope Launcher", "Inflatable boat (12 persons)", "Fiber boat (12 persons)", 
    "Motor Boats", "Motor Launch", "Country Boats", "Divers Teams (Skilled Resource)", 
    "Search and Rescue Teams for Flood (Skilled Resource)", "Scuba Divers (Skilled Resource)",

    // --- FIRE FIGHTING ---
    "Suit - fire entry", "Suit - fire proximity", "Suit - fire approach", "Suit -NBC", 
    "Clothing - Chemical protective (A, B, C)", "Fire Proof Sheet", "Breathing Apparatus - self contained",
    "Breathing Apparatus - Compressor", "Pump", "Pump - high pressure, portable", "Pump - floating", 
    "Drainage Pumps", "Air Compressor", "Extension Ladder", "Rope ladder", "Aluminum ladder",
    "ABC Type (Fire Extinguisher)", "CO2 Type (Fire Extinguisher)", "Foam Type (Fire Extinguisher)", 
    "DCP Type (Fire Extinguisher)", "Halons Type (Fire Extinguisher)", "Fire Tender", "Foam Tender", 
    "Rescue Tender", "Control Van", "Hydraulic Platform", "Turn Table Ladder", "DCP Tender", 
    "Hazmat Van", "B.A. Van", "Fire Fighting Foam", "Dry Chemical Powder", "Halons",
    // Fire Fighting Teams are skilled resources but are included here for completeness
    "Fire Fighting Team (For Oil Installation - Skilled Resource)", "Fire Fighting Team (For High Rise Buildings - Skilled Resource)",
    "Fire Fighting Team (For Ports - Skilled Resource)", "Fire Fighting Team (For Aviation - Skilled Resource)", 
    "Fire Fighting Team (For Mines - Skilled Resource)", "Fire Fighting Team (For Thermal Power Plant - Skilled Resource)", 
    "Fire Fighting Team (For Nuclear Power Plant - Skilled Resource)",

    // --- HEALTH SERVICES / MEDICAL / COVID ---
    "Spine boards", "Stretcher normal", "Stretcher medical evacuation", "Incubators for adults", 
    "Incubators for children", "First aid kits", "CT scan", "MRI", "Portable oxygen cylinders", 
    "Portable ventilators", "Portable x-rays", "Portable ultrasound", "Portable ECG", "Portable suction unit",
    "Mechanical ventilators", "Defibrillator", "Mobile OT unit", "Mobile blood bank", "Mobile lab service", 
    "Mobile hospital", "Mobile medical van", "Water filter", "Water tank", "Reservoirs treatment tank",
    "Bronchodilators", "Vaccines", "Anti snake venom", "Chlorine tablets", "Halogen tablets", 
    "Tent 80 Kgs", "Tent 40 Lbs", "Tent MK-III Private", "Tent Store", "Tent extendable 4 meters",
    "Tent extendable 2meters", "Tent Arctic", "Tarpaulin", "Plastic Sheet", "Polythene Sheet",
    "Corrugated Galvanized Iron sheet", "Polypropylene Corrugated Unifold shelter", "FRP Shutter",
    "Office building", "Yuva Mandal Bhawan", "Mahila Mandal Bhawan", "Panchayat bhawan", "School",
    "Light Ambulance Van", "Medium Ambulance Van", "Equipment Toeing Tender", "Mobilization Truck", 
    "Water Tanker - Medium capacity", "Water Tanker - Large capacity", "Road Roller",
    "VHF Sets Static", "VHF Sets Mobile", "UHF Sets Static", "UHF Sets Mobile", "Walkie Talkie Sets", 
    "HF Sets Static", "Mini-M3", "V-SAT", "INMARSAT", "Mobile Phone GSM", "Mobile Phone CDMA", 
    "GPS Hand Sets", "Video Phone Set", "Video Camera Digital", "Video Camera Beta", "Camera Digital", 
    "Video Camera DVD", "Ham Radio Operators (Skilled Resource)",
    "Air Sampler - battery operated", "NBC face mask", "Body bags", "C.D Kit danger make", "Monitor - for chemical agents",
    "Capping kit - for chlorine leak", "Containers of AFFF", "Containers of soda ash and hydroxide", "Monitor - for contamination",
    "Decontamination gears", "Direct reading dosimeter", "Distress signal unit", "Emergency response guide book", 
    "First aid kit as per MFR", "First aid kit NBC type A", "First aid kit NBC type B", "Flame ionization detector",
    "GM survey meter", "High visibility vest", "Leak storing device", "Leak tester for B.A set", "LEL Meter", 
    "Mini rad meter", "Multi gas detector with cut gum bottle", "Non sparking brush, brooms shovels", 
    "Non sparking tool", "PH meter", "PH tester", "Pipe squeezer", "Plastic drums", "Detector kit - for poison in water",
    "Portable alpha monitor", "Portable decontamination apparatus", "Safety line with chemical resistant",
    "Safety touch", "Teletector", "TLD", "Traffic cones", "Ultra violet photo ionization detector",
    "Decontamination solution", "Iodate tablets", "Mask", "Hand Gloves", "Sanitizer Spray", "Sprayer",
    "PPE Kits", "HOOD with garment", "N95 Mask", "Surgical Masks", "Boot Cover", "Surgical Gloves",
    "Face Shield", "Goggles", "Ventilator Adult", "Ventilator Paediatric", "Water-Resistant Gown", "Scrub",
    "Apron", "Gum Boots", "Heavy-Duty Gloves", "Surgical Cap", "Oxygen Cylinder Type B", "Oxygen Cylinder Type-D",
    "Body bag", "Hospital capacity", "Bed with oxygen support", "Bed with ventilators", "Oxygen generator plants",
    "Remdesivir", "Oxygen cans", "Oxymeter", "Oxygen Concentrator", "Nebulizer", "Plasma Therapy", "Gloves",
    "Shoe covers", "Hand Sanitizer", "Temperature gun", "Thermometer", "Pulse Oximeter", "Disinfectant Spray",
    "Surgical equipments", "RT-PCR device", "Oxygen supplier", "Infrared thermometer", "Digital thermometer",
    "Ultrasound scan", "Blood gas analyse", "Freezer", "Medical gas cylinder", "Infusion pump",
    "Radiographic mobile digital equipment", "Bubble humidifier", "Tubing", "Flow splitter", "Flowmeter",
    "Thorpe tube", "Venturi mask", "Laryngeal mask airway", "Lubricating jelly", "Non-heated bubble humidifier",
    "Colourimetric end-tidal CO2 (EtCO2) detector", "Non-invasive ventilator", "Invasive ventilator",
    "Laryngoscope", "Video-laryngoscope", "Electro-conductive gel", "Portable ultrasound scanner",
    "Oxygen therapy", "ICU beds", "Patient monitor", "Videolaryngoscope", "Respirator", "Surgical gowns",
    "ORS", "COVID test centres", "Vaccination centres", "Steamer", 
    "Ambulance with Oxygen support and other critical facilities", "Ambulance Attendants and Drivers (Skilled Resource)",
    "Tocilizumab", "COVID Vaccines", "COVID Specific Medicines", 
    "Oxygen Regulators and other support equipments to use oxygen Beds (with and without oxygen support)",
    "Trained Doctors and Nursing Staff for COVID (Skilled Resource)", "Thermal Scanner", "Isolation Wards",
    "Quarantine Wards", "Mobile Isolation Units", "Wheel Chairs with the Oxygen Support and IV support stand",
    "Wheel Chairs", "Aerosol Fumigators", "HFO Cannula", "Blood Fractionation Units",
    "Computerized Tomography Scans", "DG Sets",
    "Search and Rescue Teams for NBC Disasters (Skilled Resource)", "Health Workers (Skilled Resource)",
    "Driver- LMV (Skilled Resource)", "Driver- HMV (Skilled Resource)", "Labour (Skilled Resource)",
    "Aapda Mitra (Skilled Resource)", "Ex-Army personnel (Skilled Resource)", "Ex-CAPFs personnel (Skilled Resource)",
    "Four wheel drive vehicle", "Matador", "Motor Cycle", "Truck", "RTV", "Mini Bus", "Bus", "Tractor", "Trailer", 
    "Heavy Truck", "Jumper", "Loader", "VHF Sets Static", "VHF Sets Mobile", "UHF Sets Static", "UHF Sets Mobile", 
    "Walkie Talkie Sets", "HF Sets Static", "Mini-M3", "V-SAT", "INMARSAT", "Mobile Phone GSM", "Mobile Phone CDMA", 
    "GPS Hand Sets", "Video Phone Set", "Video Camera Digital", "Video Camera Beta", "Camera Digital", 
    "Video Camera DVD"
])).sort();


const OtherConfig = {
    'SourceTypes': ['Government Assets', 'Public Sector Unit', 'Private Sector', 'Rental Agency', 'Local Community', 'Other'],
};

const DYNAMIC_DATA = {
    departments: AllOrganizations,
    sources: OtherConfig.SourceTypes,
    districts: Object.keys(LocationHierarchy).sort(),
    locationMap: LocationHierarchy,
    equipmentTypes: FullEquipmentList, // NOW USING THE FULL LIST
};

// ==============================================================================
// --- END DYNAMIC DATA ---
// ==============================================================================

// Base form structure, initialized with default values from DYNAMIC_DATA
const initialFormData = {
  // Step 1
  department: DYNAMIC_DATA.departments[0] || '', 
  source: DYNAMIC_DATA.sources[0] || '',       
  // Step 2
  companyName: '',
  inchargeName: '',
  inchargeNumber: '',
  alternateNumber: '',
  landlineNumber: '',
  // Step 3 & 4 (Administrative + Specific Address)
  district: DYNAMIC_DATA.districts[0] || '', // Use real districts
  taluk: '',
  firka: '', // Firka not in provided data, kept as free text/placeholder
  village: '', // Now populated dynamically
  plotNo: '',
  street: '',
  localityCity: '',
  postalCode: '',
  // Location Validation
  isLocationValidated: false,
  latitude: null,
  longitude: null,
  // Step 5
  equipmentList: [{ name: DYNAMIC_DATA.equipmentTypes[0] || '', count: 1 }],
  // Step 6
  functionalStatus: 'Yes',
};

// --- Step Indicator Component ---
const StepIndicator = ({ step, currentStep, completedSteps }) => {
  const isCompleted = completedSteps.includes(step) || currentStep > step;
  const isActive = currentStep === step;

  let baseClasses = 'w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300';
  
  if (isCompleted) {
    baseClasses += ' bg-green-500 text-white';
    return <div className={baseClasses}><CheckCircle className="w-4 h-4" /></div>;
  } else if (isActive) {
    baseClasses += ' bg-blue-500 text-white ring-4 ring-blue-300';
  } else {
    baseClasses += ' bg-gray-200 text-gray-500';
  }

  return <div className={baseClasses}>{step}</div>;
};

// --- Main App Component ---
const App = () => {
  const [dbInstance, setDbInstance] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [currentStep, setCurrentStep] = useState(0); // 0: Login, 1-6: Form Steps, 7: Verify, 8: Submitted
  const [formData, setFormData] = useState(initialFormData);
  const [submissionStatus, setSubmissionStatus] = useState({ state: 'idle', message: '' });
  const [errorMessage, setErrorMessage] = useState('');

  // --- New State for Gemini API Integration ---
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Constants for Gemini API
  // Using gemini-1.5-flash-latest to ensure stability
  const GEMINI_MODEL = "gemini-1.5-flash-latest"; 
  const apiKey = ""; // Left empty for Canvas environment
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Track completed steps to show green checkmarks (1 to 6)
  const completedSteps = useMemo(() => {
    const completed = [];
    for (let i = 1; i < currentStep; i++) {
      completed.push(i);
    }
    return completed;
  }, [currentStep]);


  // 1. Firebase Initialization and Authentication
  useEffect(() => {
    if (!firebaseConfig) {
      console.error("Firebase config is missing.");
      setErrorMessage("Configuration error: Firebase not set up.");
      return;
    }
    
    // Set Firestore logging for debugging
    setLogLevel('error');

    try {
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const auth = getAuth(app);
      setDbInstance(db);
      setAuthInstance(auth);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // Attempt sign in using provided token or anonymously
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(auth, initialAuthToken);
            } else {
              await signInAnonymously(auth);
            }
          } catch (error) {
            console.error("Firebase Sign-in Failed:", error);
            setErrorMessage("Authentication failed. Please check your token/config.");
          }
        }
        setIsAuthReady(true); // Signal that the auth check is complete
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      setErrorMessage("Could not initialize Firebase. Check console for details.");
      setIsAuthReady(true);
    }
  }, [initialAuthToken]); // Only run once on mount

  // Function to be called by LoginScreen to transition to the form
  const handleLoginSuccess = useCallback(() => {
    setCurrentStep(1);
    setErrorMessage('');
  }, []);
  
  // --- Gemini API Call Helper with Exponential Backoff ---
  const exponentialBackoffFetch = useCallback(async (payload, retries = 5, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Throw an error to trigger the retry logic
                throw new Error(`API call failed with status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (2 ** i)));
            } else {
                throw error;
            }
        }
    }
  }, [apiUrl]);

  // --- New Gemini Feature: Generate Repair Suggestions (Step 6) ---
  const generateRepairSuggestions = async () => {
    if (formData.equipmentList.length === 0) {
        setAiResponse('Please add equipment to the list first.');
        return;
    }

    setAiLoading(true);
    setAiResponse('');
    
    const equipmentListText = formData.equipmentList
        .map(e => `${e.name} (Count: ${e.count})`)
        .join(', ');

    const systemPrompt = "You are a disaster relief operations maintenance specialist. Given a list of non-functional equipment, generate a concise, numbered list of the 3 most likely and common maintenance or repair issues required for these items to become operational. Focus on general, high-probability issues (e.g., fuel, battery, blade sharpness).";

    const userQuery = `Analyze this list of non-functional disaster relief equipment: ${equipmentListText}. Provide the 3 most likely repair suggestions.`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const result = await exponentialBackoffFetch(payload);
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No suggestions could be generated.';
        setAiResponse(text);
    } catch (error) {
        console.error("Gemini API Error:", error);
        setAiResponse('Failed to generate suggestions. Please check the network or API status.');
    } finally {
        setAiLoading(false);
    }
  };

  // 2. Data Handlers
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Reset AI suggestions if functional status changes to 'Yes'
    if (name === 'functionalStatus' && value === 'Yes') {
        setAiResponse('');
    }
  }, []);
  
  // Custom handler for District change to reset Taluk and Village
  const handleDistrictChange = useCallback((e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, district: value, taluk: '', village: '' }));
  }, []);
  
  // Custom handler for Taluk change to reset Village
  const handleTalukChange = useCallback((e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, taluk: value, village: '' }));
  }, []);

  const handleEquipmentChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const newEquipmentList = [...prev.equipmentList];
      if (field === 'count') {
        newEquipmentList[index][field] = parseInt(value) > 0 ? parseInt(value) : 1;
      } else {
        newEquipmentList[index][field] = value;
      }
      return { ...prev, equipmentList: newEquipmentList };
    });
    setAiResponse(''); // Clear AI response if equipment changes
  }, []);

  const addEquipment = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      // Use the first item from the dynamically loaded list
      equipmentList: [...prev.equipmentList, { name: DYNAMIC_DATA.equipmentTypes[0] || '', count: 1 }]
    }));
    setAiResponse(''); // Clear AI response if equipment changes
  }, []);

  const removeEquipment = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      equipmentList: prev.equipmentList.filter((_, i) => i !== index)
    }));
    setAiResponse(''); // Clear AI response if equipment changes
  }, []);

  // 3. Navigation
  const nextStep = () => {
    // Custom validation before moving to the next step
    if (!validateStep(currentStep)) return;
    setCurrentStep(prev => Math.min(prev + 1, 7)); // Max step is 7 (Verify)
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1)); // Min step is 1 (after login)
  };

  const validateStep = (step) => {
    let isValid = true;
    let message = '';

    switch (step) {
      case 1: // Department & Source
        if (!formData.department || !formData.source) {
          message = 'Please select both Department and Source.';
          isValid = false;
        }
        break;
      case 2: // Entity Details
        if (!formData.companyName || !formData.inchargeName || !formData.inchargeNumber) {
          message = 'Company/Individual Name, Incharge Name, and Incharge Number are required.';
          isValid = false;
        } else if (!/^\d{10}$/.test(formData.inchargeNumber)) {
          message = 'Incharge Number must be a valid 10-digit mobile number.';
          isValid = false;
        }
        break;
      case 3: // Administrative Address
        if (!formData.district || !formData.taluk || !formData.village) {
          message = 'District, Taluk, and Village are required.';
          isValid = false;
        }
        // Firka is optional/placeholder as it's not in the provided CSV data
        break; 
      case 4: // Specific Address & Validation
        if (!formData.plotNo || !formData.street || !formData.localityCity || !formData.postalCode) {
          message = 'All specific address fields are required.';
          isValid = false;
        } else if (!formData.isLocationValidated) {
          message = 'Please validate the address on the map.';
          isValid = false;
        }
        break;
      case 5: // Equipment List
        if (formData.equipmentList.length === 0 || formData.equipmentList.some(e => !e.name || e.count <= 0)) {
          message = 'Please add at least one equipment entry with a valid count.';
          isValid = false;
        }
        break;
      case 6: // Functional Status (Leads to Verify)
        if (!formData.functionalStatus) {
            message = 'Please select the functional status.';
            isValid = false;
        }
        break;
      default:
        break;
    }

    setErrorMessage(isValid ? '' : message);
    return isValid;
  };

  // Mock Location Validation (Step 4)
  const validateLocation = () => {
    setErrorMessage('');
    // Simulate API call and map interaction
    setSubmissionStatus({ state: 'loading', message: 'Validating location...' });
    setTimeout(() => {
      // Simulate successful validation and location data capture
      setFormData(prev => ({
        ...prev,
        isLocationValidated: true,
        latitude: 13.053082, // Mock Latitude
        longitude: 80.272961, // Mock Longitude
      }));
      setSubmissionStatus({ state: 'success', message: 'Location confirmed!' });
      setTimeout(() => setSubmissionStatus({ state: 'idle', message: '' }), 3000);
    }, 1500);
  };

  // 4. Firestore Submission
  const handleInventorySubmit = async () => {
    if (!dbInstance || !userId) {
      setErrorMessage("Authentication or Database not ready.");
      return;
    }
    
    setSubmissionStatus({ state: 'loading', message: 'Submitting Inventory...' });
    setErrorMessage('');

    try {
      // Private data path: /artifacts/{appId}/users/{userId}/inventory_entries/{docId}
      const inventoryRef = collection(dbInstance, 'artifacts', appId, 'users', userId, 'inventory_entries');
      const docRef = doc(inventoryRef);

      const dataToSave = {
        ...formData,
        aiRepairSuggestions: aiResponse, // Include AI response in submission
        userId: userId,
        appId: appId,
        createdAt: serverTimestamp(),
      };

      await setDoc(docRef, dataToSave);

      setSubmissionStatus({ state: 'success', message: 'Inventory entry submitted successfully!' });
      setCurrentStep(8); // Move to success screen
      setFormData(initialFormData); // Reset form data
      setAiResponse(''); // Reset AI response
    } catch (error) {
      console.error("Firestore Submission Error:", error);
      setSubmissionStatus({ state: 'error', message: 'Submission failed. See console for details.' });
      setErrorMessage('Failed to save data. Please try again.');
    }
  };

  // --- Render Functions for each Step ---

  const renderFormStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">1. Select Department and Source</h2>
            {/* Department uses AllOrganizations data */}
            {renderSelect('department', 'Department', DYNAMIC_DATA.departments)}
            {/* Source uses OtherConfig.SourceTypes data */}
            {renderSelect('source', 'Source', DYNAMIC_DATA.sources)}
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">2. Enter Entity / Individual Details</h2>
            {renderInput('companyName', 'Company / Individual name', 'Enter company / individual name')}
            {renderInput('inchargeName', 'Incharge name', 'Enter incharge name')}
            {renderInput('inchargeNumber', 'Incharge Mobile Number', 'Enter incharge number', 'tel', '10-digit mobile number')}
            {renderInput('alternateNumber', 'Alternate Number', 'Enter alternate mobile number (optional)', 'tel')}
            {renderInput('landlineNumber', 'Landline number', 'Enter landline number (optional)', 'tel')}
          </div>
        );
      case 3:
        const currentTaluks = formData.district ? Object.keys(DYNAMIC_DATA.locationMap[formData.district] || {}).sort() : [];
        const currentVillages = formData.district && formData.taluk 
            ? (DYNAMIC_DATA.locationMap[formData.district][formData.taluk] || []).sort() 
            : [];

        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">3. Provide Address (Administrative)</h2>
            {/* District dropdown */}
            {renderSelect('district', 'District', DYNAMIC_DATA.districts, handleDistrictChange)}
            
            {/* Taluk dropdown - depends on selected District */}
            {renderSelect('taluk', 'Taluk', currentTaluks, handleTalukChange, !formData.district)}
            
            {/* Firka input - kept as free text/placeholder */}
            {renderInput('firka', 'Firka', 'Enter Firka (specific administrative block)')}

            {/* Village dropdown - depends on selected Taluk */}
            {renderSelect('village', 'Village', currentVillages, handleChange, !formData.taluk)}
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">4. Enter Specific Address & Validate</h2>
            {renderInput('plotNo', 'Plot No', 'Enter plot no')}
            {renderInput('street', 'Street', 'Enter street')}
            {renderInput('localityCity', 'Locality/City', 'Enter locality/city')}
            {renderInput('postalCode', 'Postal Code', 'Enter postal code', 'number', 'e.g., 600005')}

            <div className="p-4 bg-gray-50 rounded-lg shadow-inner">
                <p className="font-medium text-gray-700 mb-2 flex items-center"><MapPin className="w-5 h-5 mr-2 text-blue-500" /> Location Validation</p>
                <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${formData.isLocationValidated ? 'text-green-600' : 'text-red-500'}`}>
                        Status: {formData.isLocationValidated ? 'Validated' : 'Pending'}
                    </span>
                    <button
                        type="button"
                        onClick={validateLocation}
                        disabled={submissionStatus.state === 'loading'}
                        className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 ${formData.isLocationValidated ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        {submissionStatus.state === 'loading' ? 'Validating...' : 'VALIDATE'}
                    </button>
                </div>
                {formData.isLocationValidated && (
                    <p className="text-xs mt-2 text-gray-500">
                        Lat: {formData.latitude}, Lon: {formData.longitude} (Mocked data)
                    </p>
                )}
                {submissionStatus.state === 'error' && submissionStatus.message.includes('Location') && (
                    <p className="text-red-500 text-sm mt-2">{submissionStatus.message}</p>
                )}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">5. Add Available Equipment List</h2>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="font-medium text-gray-600">Entries: {formData.equipmentList.length}</span>
                <button
                    type="button"
                    onClick={addEquipment}
                    className="flex items-center text-blue-500 hover:text-blue-700 transition-colors"
                >
                    <PlusCircle className="w-6 h-6 mr-1" /> Add Equipment
                </button>
            </div>

            <div className="space-y-4">
              {formData.equipmentList.map((item, index) => (
                <div key={index} className="flex space-x-2 items-center p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Equipment Name Select (uses full dynamic list) */}
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 block">Equipment Name</label>
                    <select
                      value={item.name}
                      onChange={(e) => handleEquipmentChange(index, 'name', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {/* Use the dynamically loaded equipment list */}
                      {DYNAMIC_DATA.equipmentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Count Input */}
                  <div className="w-20">
                    <label className="text-xs font-medium text-gray-500 block">Count</label>
                    <input
                      type="number"
                      min="1"
                      value={item.count}
                      onChange={(e) => handleEquipmentChange(index, 'count', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-center focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeEquipment(index)}
                    className="text-red-500 hover:text-red-700 transition-colors self-end pb-1"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">6. Set Functional Status and Verify</h2>
            <div className="p-4 bg-white rounded-lg shadow border border-gray-200 space-y-3">
                <p className="font-medium text-gray-700">Functional status</p>
                <div className="flex items-center space-x-6">
                    {['Yes', 'No'].map((status) => (
                        <label key={status} className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="functionalStatus"
                                value={status}
                                checked={formData.functionalStatus === status}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-700">{status}</span>
                        </label>
                    ))}
                </div>

                {/* --- Gemini Feature UI --- */}
                {formData.functionalStatus === 'No' && (
                    <div className="pt-4 border-t mt-4 space-y-3">
                        <button
                            onClick={generateRepairSuggestions}
                            disabled={aiLoading}
                            className={`w-full flex items-center justify-center font-bold py-2 px-4 rounded-lg transition-transform active:scale-95 shadow-md ${aiLoading ? 'bg-gray-400 text-gray-700' : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'}`}
                        >
                            <Sparkles className="w-5 h-5 mr-2" />
                            {aiLoading ? 'Analyzing Equipment...' : 'AI Repair Suggestion ✨'}
                        </button>
                        
                        {aiResponse && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="font-semibold text-sm text-yellow-800 mb-1">Deployment Readiness Summary:</p>
                                <p className="text-sm text-gray-700 whitespace-pre-line">{aiResponse}</p>
                            </div>
                        )}
                    </div>
                )}
                {/* --- End Gemini Feature UI --- */}
            </div>
          </div>
        );
      case 7: // Verify Screen (Summary)
        return (
            <VerifyScreen 
                data={formData} 
                onEdit={() => setCurrentStep(1)} 
                onSubmit={handleInventorySubmit} 
                submissionStatus={submissionStatus} 
                aiResponse={aiResponse} // Pass AI response to verification
            />
        );
      case 8: // Submission Success Screen
        return (
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-3xl font-bold text-green-700 mb-2">Submission Successful!</h2>
                <p className="text-gray-600 mb-6">Your inventory has been successfully recorded in Firestore.</p>
                <p className="text-sm text-gray-500 mb-4">
                    Document ID: {submissionStatus.message.split(' ').pop()} (Mocked ID for Success)
                </p>
                <button
                    onClick={() => {
                        setSubmissionStatus({ state: 'idle', message: '' });
                        setCurrentStep(1); // Start a new entry
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-transform active:scale-95"
                >
                    Start New Entry
                </button>
            </div>
        );
      default:
        return null;
    }
  };

  const renderInput = (name, label, placeholder, type = 'text', hint = '') => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/50 placeholder-gray-500 transition"
        required={!label.includes('(optional)')}
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );

  const renderSelect = (name, label, options, onChangeHandler = handleChange, disabled = false) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={formData[name]}
        onChange={onChangeHandler}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/50 disabled:bg-gray-200/50 disabled:text-gray-500 transition"
        required
        disabled={disabled}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );

  // --- Render Main UI ---

  // Display Login Screen until auth is ready and userId is set
  if (!isAuthReady || currentStep === 0) {
    return (
      <LoginScreen 
        authInstance={authInstance} 
        setIsAuthReady={setIsAuthReady} 
        setUserId={setUserId}
        errorMessage={errorMessage}
        loading={!isAuthReady}
        onLoginSuccess={handleLoginSuccess} // NEW: Pass handler to transition to step 1
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 p-4 sm:p-8 flex items-start justify-center">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-200">
        
        {/* Header and Step Indicators */}
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Inventory Entry</h1>
            <p className="text-gray-500 mt-2">Please fill out all fields below to add/update the inventory.</p>
        </div>

        {currentStep < 7 && currentStep >= 1 && (
            <>
                <div className="flex justify-between items-center mb-8 p-4 bg-white/60 rounded-xl shadow-inner border border-gray-100">
                    {[1, 2, 3, 4, 5, 6].map(step => (
                        <StepIndicator key={step} step={step} currentStep={currentStep} completedSteps={completedSteps} />
                    ))}
                </div>

                <div className="p-6 bg-white/60 rounded-xl shadow-md border border-gray-100">
                    {renderFormStep()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                    {/* Previous Button (Hidden on Step 1) */}
                    {currentStep > 1 && currentStep < 7 && (
                        <button
                            onClick={prevStep}
                            className="flex items-center bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition-transform active:scale-95 shadow-md"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" /> Previous
                        </button>
                    )}

                    {/* Placeholder for alignment on Step 1 */}
                    {currentStep === 1 && <div />}

                    {/* Next/Verify Button */}
                    {currentStep < 7 && (
                        <button
                            onClick={nextStep}
                            disabled={submissionStatus.state === 'loading'}
                            className="flex items-center ml-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform active:scale-95 shadow-md"
                        >
                            {currentStep === 6 ? 'VERIFY' : 'Next'}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    )}
                </div>
            </>
        )}
        
        {/* Verify/Success Screen */}
        {(currentStep === 7 || currentStep === 8) && renderFormStep()}

        {/* Status/Error Messages */}
        {(errorMessage || submissionStatus.state === 'error' || submissionStatus.state === 'success') && (
          <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
            errorMessage || submissionStatus.state === 'error'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : submissionStatus.state === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'hidden'
          }`}>
            {errorMessage || submissionStatus.message}
          </div>
        )}
        {submissionStatus.state === 'loading' && (
          <div className="mt-4 p-3 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 border border-blue-300">
            {submissionStatus.message}
          </div>
        )}
        
        <p className="text-xs text-center text-gray-400 mt-6">
            User ID: {userId || 'Authenticating...'}
        </p>

      </div>
    </div>
  );
};

// --- Separate Component for Login (Step 0) ---
const LoginScreen = ({ authInstance, setIsAuthReady, setUserId, errorMessage, loading, onLoginSuccess }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginMode, setLoginMode] = useState('phone'); // 'phone' or 'email'
    const [loginLoading, setLoginLoading] = useState(false);

    // This function primarily exists to simulate the UI interaction from the manual
    const handleLogin = async () => {
        if (!authInstance) return;
        setLoginLoading(true);
        
        // --- SIMULATION OF LOGIN PROCESS ---
        // In a real app, this is where you would call:
        // 1. signInWithPhoneNumber + OTP verification OR 
        // 2. signInWithEmailAndPassword
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Since Firebase security rules are set by the environment, we rely on the 
        // existing anonymous/custom token sign-in performed in the main App useEffect.
        const user = authInstance.currentUser;
        if (user) {
            setUserId(user.uid);
            // On successful sign-in, call the prop to advance the main app state
            onLoginSuccess();
        } else {
            // Fallback sign-in attempt (should not be necessary if initialAuthToken exists)
            try {
                await signInAnonymously(authInstance);
                setUserId(authInstance.currentUser.uid);
                onLoginSuccess();
            } catch(e) {
                console.error("Manual fallback sign-in failed:", e);
                // Display a generic error if the fallback also fails
                // NOTE: The main App component's useEffect usually catches this failure early.
            }
        }
        // --- END SIMULATION ---
        setLoginLoading(false);
    };

    // Determine if the main login button should be enabled
    const isLoginButtonEnabled = useMemo(() => {
        if (loginLoading || loading) return false;
        if (loginMode === 'phone') {
            return phoneNumber.length === 10;
        }
        if (loginMode === 'email') {
            // Simple validation: check if email and password have been entered
            return email.includes('@') && password.length >= 6; 
        }
        return false;
    }, [loginLoading, loading, loginMode, phoneNumber, email, password]);


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 space-y-6 border border-gray-200">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800">AP Admin Portal</h1>
                    <p className="text-gray-500 mt-2">Sign in to Continue</p>
                </div>

                {/* Login Mode Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setLoginMode('phone')}
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg font-semibold transition-colors ${
                            loginMode === 'phone' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:bg-white'
                        }`}
                    >
                        <Phone className="w-4 h-4 mr-2" /> Phone Number
                    </button>
                    <button
                        onClick={() => setLoginMode('email')}
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg font-semibold transition-colors ${
                            loginMode === 'email' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:bg-white'
                        }`}
                    >
                        <Mail className="w-4 h-4 mr-2" /> Email / Password
                    </button>
                </div>

                {/* Input Fields based on Mode */}
                {loginMode === 'phone' ? (
                    <div className="space-y-4">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-600">Registered Mobile Number</label>
                        <input
                            type="tel"
                            id="phone"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Enter your 10-digit mobile number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/50 placeholder-gray-500 transition"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-600">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/50 placeholder-gray-500 transition"
                        />
                        <label htmlFor="password" className="block text-sm font-medium text-gray-600">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password (min. 6 characters)"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/50 placeholder-gray-500 transition"
                        />
                    </div>
                )}
                

                <button
                    onClick={handleLogin}
                    disabled={!isLoginButtonEnabled} 
                    className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-lg shadow-lg transition-all transform hover:scale-105 active:scale-100 disabled:opacity-60 disabled:pointer-events-none"
                >
                    {loginLoading || loading ? 'Verifying...' : (
                        <>
                            <LogIn className="w-5 h-5 mr-2" />
                            SIGN IN
                        </>
                    )}
                </button>
                
                {errorMessage && (
                    <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm border border-red-300 font-medium">
                        {errorMessage}
                    </div>
                )}
                {loading && !errorMessage && (
                    <div className="p-3 bg-blue-100 text-blue-800 rounded-lg text-sm border border-blue-300 font-medium">
                        Initializing Firebase...
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Separate Component for Verification (Step 7) ---
const VerifyScreen = ({ data, onEdit, onSubmit, submissionStatus, aiResponse }) => {
    const fields = [
        { label: 'Department', value: data.department, step: 1 },
        { label: 'Source', value: data.source, step: 1 },
        { label: 'Company/Individual', value: data.companyName, step: 2 },
        { label: 'Incharge Name', value: data.inchargeName, step: 2 },
        { label: 'Incharge No', value: data.inchargeNumber, step: 2 },
        { label: 'District', value: data.district, step: 3 },
        { label: 'Taluk', value: data.taluk, step: 3 },
        { label: 'Plot/Street/City', value: `${data.plotNo}, ${data.street}, ${data.localityCity}`, step: 4 },
        { label: 'Postal Code', value: data.postalCode, step: 4 },
        { label: 'Location (Lat/Lon)', value: data.isLocationValidated ? `${data.latitude}, ${data.longitude}` : 'Not Validated', step: 4 },
    ];

    return (
        <div className="space-y-8 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3">Verify Inventory Entry</h2>
            
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-medium text-gray-600">{field.label}:</span>
                        <span className="text-gray-800">{field.value}</span>
                    </div>
                ))}
            </div>

            {/* Equipment List */}
            <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Equipment List</h3>
                {data.equipmentList.map((item, index) => (
                    <div key={index} className="flex justify-between py-1 text-gray-600 border-b border-gray-100">
                        <span>{index + 1}. {item.name}</span>
                        <span className="font-semibold">{item.count} unit(s)</span>
                    </div>
                ))}
            </div>

            {/* Functional Status */}
            <div className="pt-4 border-t">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Functional Status</h3>
                <span className={`font-bold text-lg ${data.functionalStatus === 'Yes' ? 'text-green-600' : 'text-red-500'}`}>
                    {data.functionalStatus}
                </span>

                {/* AI Repair Suggestions in Verify Screen */}
                {data.functionalStatus === 'No' && aiResponse && (
                     <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="font-semibold text-sm text-yellow-800 mb-1">AI Repair Suggestions:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{aiResponse}</p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
                <button
                    onClick={onEdit}
                    className="flex items-center bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition-transform active:scale-95 shadow-md"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" /> Edit
                </button>

                <button
                    onClick={onSubmit}
                    disabled={submissionStatus.state === 'loading'}
                    className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-transform active:scale-95 shadow-md disabled:opacity-50"
                >
                    {submissionStatus.state === 'loading' ? 'Submitting...' : 'SUBMIT'}
                    <CheckCircle className="w-5 h-5 ml-2" />
                </button>
            </div>
        </div>
    );
};


export default App;
