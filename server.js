import express from "express";
import multer from "multer";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

if (!fs.existsSync("uploads")) {
	fs.mkdirSync("uploads");
} 
// Middleware
app.use(cors());
app.use(express.json());

// Multer setup 
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/");
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + "-" + file.originalname);
	}
});

const upload = multer({ storage });

// OpenAI Setup 
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});
// Call History Setup 
const historyFile = "history.json";

function readHistory() {
	if (!fs.existsSync(historyFile)) {
		return [];
	}

	const data = fs.readFileSync(historyFile, "utf8");
	return data ? JSON.parse(data) : [];
}

function saveHistory(history) {
	fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

// Routes 
// Home route 
app.get("/", (req, res) => {
	res.send("LeadMaximizer server is running");
});
// Test GET route 
app.get("/api/test", (req, res) => {
	res.json({
		message: "API is working",
		app: "LeadMaximizer"
	});
});

// Analyze test routes 
app.get("/api/analyze-test", (req, res) => {
	res.json({
		message: "POST route exists and is working"
	});
});

// POST route (receives data0
app.post("/api/analyze", (req, res) => {
	const { leadType, market, notes } = req.body;

	res.json({
		message: "Received data successfully",
		data: {
			leadType, 
			market, 
			notes
		}
	});
});
// Upload + transcribe route
app.post("/api/upload", upload.single("audio"), async (req, res) => {
	try {
		console.log("Upload route hit");
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}
		console.log(req.file);
		
		console.log("Starting transcription...");
		const transcription = await openai.audio.transcriptions.create({
			file: fs.createReadStream(req.file.path),
			model: "gpt-4o-transcribe",
			language: "en",
			prompt: "Transcribe everything exactly as spoken in this real estate call, including quiet speech, filler words, incomplete phrases, and low-volume words."
		});
		console.log("Transcription done:", transcription.text);
		const transcriptText = transcription.text;
		const callerType = "agent"; // or "assistant"

		console.log("Starting analysis...");
		const analysis = await openai.responses.create({
			model: "gpt-5.4",
			input: `
You are an elite real estate cold-calling coach.

Your job is to help a caller book listing appointments.

Tone rules: 
- confident, not aggressive
- professional, not casual
- no apologies 
- no lines that make it easy for the prospect to say no
- sound like a negotiation expert
- use direct, controlled, and professional language
- avoid weak or apologetic phrasing
- use short, direct language 
- avoid over-explaining 

CALLER TYPE:
${callerType}


CALLER IDENTITY:
- always include a confident, professional introduction
- the caller should clearly state their name 
- the company can be included naturally, not forced or overly formal
- the introduction should feel natural, not scripted

CALLER ROLE RULES: 
- If CALLER TYPE is "agent":
	-speak with direct personal authority
	- Refer to your own experience and knowledge 
- If CALLER TYPE is "assistant":
	- never say "I'm just calling for"
	- position yourself as working with the agent 
	- maintain authority through association, not apology 
	- sound like part of a professional team, not the middleman 

COLD CALLING STRATEGY RULES:
- never assume the homeowner automatically wants to sell 
- start neutral and discovery-based 
- the goal is to uncover interest, not force it 
- maintain control of the conversation at all times
- guide the conversation step-by-step instead of asking open-ended permission questions 
- avoid yes/no questions that allow the prospect to easily shut down the conversation 
- if no intent is clear, guide toward curiosity, not pressure
- once interest is detected, shift toward control and appointment-setting 

EVALUATION RULES:
- evaluate performance based on how the conversation actually progresses, not just ideal phrasing
- prioritize outcomes over perfection (did the caller move the conversation forward?)
- if a line is technically imperfect but improves control, reduces resistance, or creates curiosity, treat it as effective
- do not over-penalize phrases like "I understand" if they are used to absorb resistance and maintain control
- recognize when the prospect's tone or stance improves (resistance → neutral → curiosity → openness)
- reward momentum: if the caller regains control after pushback, increase the score 
- only critique phrases if it clearly weakens control or stops progress
- avoid rigid or dogmatic coaching; analyze based on real conversation flow 
- distinguish between minor optimization and real mistakes 
- do not treat effective lines as negative just because they are not ideal 
- if a line maintains control and moves the conversation forward, treat it as a strength or neutral, not a flaw
- weight the outcome of the line more than the wording of the line
- ask: did this line improve, maintain, or reduce control?
- base feedback on impact, not theoretical perfection
- actively reward strong structure and professional framing, even if minor imperfections exist
- if the caller maintains control and avoid early rejection traps, do not score the call as low-performance 
- distinguish between weak structure and complete failure; not all imperfect calls should be scored as poor performance 
- only assign very low scores when the caller loses control, invites rejection, or fails to continue the conversation
- avoid exaggerating mistakes describe issues proportionally to their actual impact on the conversation
- avoid exaggerating mistakes; describe them proportionally to their actual impact
- if the caller establishes a strong frame and guide the conversation effectively, treat the call as high control even if the final question is slightly open-ended  
- avoid criticizing common professional phrasing that is widely used in real estate unless it clearly reduces effectiveness 

MOMENTUM ANALYSIS RULES:
- track how the prospect's stance changes throughout the conversation 
- identify key moments where the conversation shifts (resistance → neutral → curiosity → engagement)
- label momentum stages as:
	- resistance (pushback, rejection)
	- neutral (not engaged but not rejecting)
	- curiosity (open to thinking or considering)
	- engagement (actively participating in discussion)
- recognize when the caller causes a positive shift in momentum 
- highlight the exact line or approach that created the shift
- if the caller loses momentum, identify where and why 
- use momentum shifts as a major factor in scoring and feedback 
	- no shift → low score
	- neural only → mid score
	- positive shift (curiosity or engagement) → high score 

Analyze this transcript:

${transcriptText}

Return:

CALL SCORE:
- score from 1-10
- base the score primarily on:
	- control of the conversation 
	- ability to handle resistance
	- movement of the prospect (did they become more open?)
	- progress toward a listing conversation or future appointment 
- weight outcomes over phrasing:
	- judge each line by whether it improved, maintained, or reduced control 
	- do not penalize lines that are imperfect if they still move the conversation forward 
- use the full scoring range with clear separation:
	- 1-3: failed calls (loss of control, invites rejection, no recovery)
	- 4-5: weak calls (basic structure but little control or progress)
	- 6-7: competent calls (professional, some control, limited momentum)
	- 8-9: strong calls( clear control, structured discovery, creates forward movement)
	- 10: elite execution (tight control, strong momentum, clear path to appointment)
- actively reward:
	- strong openings that avoid early rejection	
	- clear structure and professional authority 
	- movement toward discovery or engagement
	- recovery after pushback 
- a call that includes a professional introduction, clear structure, and relevant topic framing should not be scored in the lowest tier, even if control is weak
- reserve scores below a 4 for calls that collapse, invite rejection directly, or fail to continue the conversation 
- do not reduce the score significantly for small phrasing improvements if overall control and structure are strong
- do not base the score only on perfect wording or textbook structure 
- do not compress score toward the middle; differentiate clearly between weka, average, and strong performance
- if the caller establishes strong control, avoids early rejection, and uses structured discovery, the score should fall in the 8-9 range even if minor imperfections exist 

LEAD STATUS:
- Not Interested / Curious / Open / Ready
- determine status only from the prospect's actual response 
- if no clear response is present, classify as "Neutral"
- do not infer curiosity or interest without evidence 

CONTROL LEVEL:
- Low / Medium / High 
	- high control: the caller sets the frame, avoids early rejection, and guides the conversation into structured discovery 
	- medium control: the caller has structure but allows multiple easy exits or relies on broad/open questions 
	- low control: the caller gives away direction, invites rejection, or fails to guide the conversation 
- do not downgrade control level for a single open-ended question if the overall structure and framing maintain direction 

MOMENTUM SHIFTS:
- identify 1-3 key turning points in the conversation 
- describe the shift in the prospect's mindset (resistance → neutral → curiosity → engagement)
- explain what the caller said or did that caused the shift
- reference specific lines or behaviors from the transcript when possible
- if no meaningful shift occurred, explain why the conversation stayed flat 

SUMMARY:
- 2-3 sentences max

WHAT WENT WELL:
- max 3 bullets 
- highlight moments where the caller improved the situation (especially after resistance)
- only include meaningful strengths that contributed to control or progress 
- if the call is weak, limit strengths instead of stretching minor positives 

WHAT TO FIX:
- max 4 bullets (clear + blunt)
- only include issues that actually reduced control or slowed progress
- do not include minor phrasing critiques if the line still worked in context 

BETTER OPENING:
- must include a confident introduction
- must include the caller introducing themselves by name 
- adjust based on CALLER TYPE 
- if assistant → reference agent naturally ("I work with...")
- one professional, confident line 
- should guide the conversation forward 
- should NOT invite easy rejection 
- must not assume the homeowner wants to sell

NEXT MOVE:
- one action that helps move toward a listing appointment
- must keep control of the conversation 
- give the exact next sentence the agent should say
- if interest is unclear → use a guided question (not yes/no)
- if interest is present → move directly toward setting a listing appointment

SELLER MOTIVATION (inferred):
- what might be driving this seller 
- if unclear, suggest likely motivations to explore

OPTIONS TO PRESENT: 
- suggest 2-3 ways the agent could position options (listing, off-market, cash offer, etc.)

RELOCATION / NEXT HOME:
- if applicable, suggest how the agent could help the seller with their next move 
- if not applicable, say "Not enough information"

Keep everything concise and practical, and realistic to how top agents speak. 
      `
		});
		
		console.log("Analysis done:", analysis.output_text);

		/*
		const history = readHistory();

		const newCall = {
			id: Date.now(),
			date: new Date().toISOString(),
			fileName: req.file.originalname,
			transcript: transcription.text,
			analysis: analysis.output_text
		};
		
		history.unshift(newCall);
		saveHistory(history);
		*/

		res.json({
			message: "File uploaded and transcribed, and analyzed",
			transcript: transcription.text,
			analysis: analysis.output_text
		});
	} catch (error) {
		console.error(error);

		res.status(500).json({
			error: "Something went wrong",
			details: error.message
		});
	}
});
// Get call history
app.get("/api/history", (req, res) => {
	res.json([]);
});
// Delete a saved call 
app.delete("/api/history/:id", (req, res) => {
	try {
		console.log("DELETE route hit:", req.params.id);
		const callId = Number(req.params.id);
		const history = readHistory();

		const updatedHistory = history.filter(call => Number(call.id) !== callId);

		if (updatedHistory.length === history.length) {
			return res.status(404).json({
				error: "Call not found"
			});
		}

		saveHistory(updatedHistory);

		res.json({
			message: "Call deleted successfully.",
			id: callId 
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: "Could not delete call.",
			details: error.message
		});
	}
});

// Rename a saved call 
app.patch("/api/history/:id", (req, res) => {
	try { 
		const callId = Number(req.params.id);
		const { newName } = req.body;

		if (!newName || !newName.trim()) {
			return res.status(400).json({
				error: "New name is required."
			});
		}

		const history = readHistory();

		const call = history.find(call => Number(call.id) === callId);

		if (!call) {
			return res.status(404).json({
				error: "Call not found."
			});
		}

		call.displayName = newName.trim();

		saveHistory(history);

		res.json({
			message: "Call renamed successfully.",
			id: callId,
			displayName: call.displayName
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: "Could not rename call.",
			details: error.message
		});
	}
});

// Start server 
app.listen(PORT, () => { 
	console.log(`Server running at http://localhost:${PORT}`);
});