-- GuitarOS Listener Script
-- Polls reaper_cmd.json for commands

-- Dynamic path resolution: works in dev (D:/Project/GuitarOS1) and portable install
local function get_cmd_path()
  -- Option 1: environment variable set by the app (future-proof)
  local env_path = os.getenv("GUITAROS_DATA")
  if env_path and env_path ~= "" then
    return env_path .. "/reaper_cmd.json"
  end

  -- Option 2: resolve relative to this script's location
  -- Script is at: <root>/Source/scripts/reaper_listener.lua
  --   or at:      <root>/Apps/Reaper/Reaper64/Scripts/reaper_listener.lua
  -- Data is at:   <root>/Data/reaper_cmd.json
  local script_path = ({reaper.get_action_context()})[2] or ""
  local script_dir = script_path:match("(.+)[/\\][^/\\]+$") or ""

  -- Walk up to find Data/ folder (try up to 5 levels)
  local dir = script_dir
  for _ = 1, 5 do
    local candidate = dir .. "/Data/reaper_cmd.json"
    local f = io.open(candidate, "r")
    if f then
      f:close()
      return candidate
    end
    -- Also try without file existing (will be created by app on first command)
    local data_dir = dir .. "/Data"
    local test = io.open(data_dir, "r")
    if test then
      test:close()
      return data_dir .. "/reaper_cmd.json"
    end
    dir = dir:match("(.+)[/\\][^/\\]+$") or dir
  end

  -- Hardcoded fallback (update if project moves)
  return "D:/Project/GuitarOS1/Data/reaper_cmd.json"
end

local json_path = get_cmd_path()
local last_timestamp = 0

function log(msg)
  reaper.ShowConsoleMsg(msg .. "\n")
end

log("GuitarOS Listener: cmd file = " .. json_path)

-- Simple JSON parser (Robust enough for our needs)
function parse_json(str)
  local data = {}
  data.action = str:match('"action":%s*"(.-)"')
  data.timestamp = str:match('"timestamp":%s*(%d+)')
  data.bpm = str:match('"bpm":%s*(%d+)')
  data.backing = str:match('"backing":%s*"(.-)"')
  data.original = str:match('"original":%s*"(.-)"')
  return data
end

function read_file(path)
    local f = io.open(path, "r")
    if not f then return nil end
    local content = f:read("*all")
    f:close()
    return content
end

function main()
  local content = read_file(json_path)
  
  if content then
    local data = parse_json(content)
    
    -- Check if new command and valid timestamp
    if data.timestamp and tonumber(data.timestamp) > last_timestamp then
      last_timestamp = tonumber(data.timestamp)
      
        if data.action == "LOAD_EXERCISE" then
        log("GuitarOS: Loading Exercise...")

        -- 1. New Project (Clean Slate)
        -- Remove all tracks to ensure clean slate
        local track_count = reaper.CountTracks(0)
        for i = track_count - 1, 0, -1 do
            local tr = reaper.GetTrack(0, i)
            reaper.DeleteTrack(tr)
        end
        
        -- 2. Set Original BPM (Before loading audio to ensure grid alignment)
        if data.bpm then
           -- Remove all tempo markers first
           local count_markers = reaper.CountTempoTimeSigMarkers(0)
           for i = count_markers - 1, 0, -1 do
               reaper.DeleteTempoTimeSigMarker(0, i)
           end
           -- Set Project BPM at 0.0s
           reaper.SetTempoTimeSigMarker(0, -1, 0, -1, -1, tonumber(data.bpm), 0, 0, false)
           reaper.UpdateTimeline()
           log("BPM Set to: " .. data.bpm)
        end

        ----------------------------------------------------
        -- Track 1: Guitar (Input 2)
        ----------------------------------------------------
        reaper.InsertTrackAtIndex(0, true)
        local tr_guitar = reaper.GetTrack(0, 0)
        reaper.GetSetMediaTrackInfo_String(tr_guitar, "P_NAME", "Guitar", true)
        
        -- Input 2 (Mono) -> Value 1 (0-indexed)
        reaper.SetMediaTrackInfo_Value(tr_guitar, "I_RECINPUT", 1) 
        
        -- Record Arm Off (User requested "запись выключена")
        reaper.SetMediaTrackInfo_Value(tr_guitar, "I_RECARM", 0)   
        
        -- Monitor On
        reaper.SetMediaTrackInfo_Value(tr_guitar, "I_RECMON", 1)   
        
        reaper.SetTrackColor(tr_guitar, reaper.ColorToNative(255, 100, 100))

        ----------------------------------------------------
        -- Track 2: Backing Track
        ----------------------------------------------------
        if data.backing and data.backing ~= "" and data.backing ~= "null" then
            reaper.InsertTrackAtIndex(1, true)
            local tr_backing = reaper.GetTrack(0, 1)
            reaper.GetSetMediaTrackInfo_String(tr_backing, "P_NAME", "Backing", true)
            
            reaper.SetOnlyTrackSelected(tr_backing)
            reaper.SetEditCurPos(0, false, false) -- Reset Cursor to 0
            reaper.InsertMedia(data.backing, 0)
            
            reaper.SetTrackColor(tr_backing, reaper.ColorToNative(100, 150, 255))
        end

        ----------------------------------------------------
        -- Track 3: Original Song
        ----------------------------------------------------
        if data.original and data.original ~= "" and data.original ~= "null" then
            local idx = reaper.CountTracks(0)
            reaper.InsertTrackAtIndex(idx, true)
            local tr_orig = reaper.GetTrack(0, idx)
            reaper.GetSetMediaTrackInfo_String(tr_orig, "P_NAME", "Original", true)
            
            reaper.SetOnlyTrackSelected(tr_orig)
            reaper.SetEditCurPos(0, false, false) -- Reset Cursor to 0
            reaper.InsertMedia(data.original, 0)
            
            -- Muted by default or low volume? User said "podgruzhaem ... original separately".
            -- Usually for reference. Let's keep it visible but maybe not muted if they want to hear it?
            -- Previous code muted it. Let's keep it unmuted but lower volume? Or Muted?
            -- "Original Separate" -> usually for A/B testing.
            -- Let's MUTE it by default to avoid clash with backing, user can unmute.
            reaper.SetMediaTrackInfo_Value(tr_orig, "B_MUTE", 0)
            reaper.SetMediaTrackInfo_Value(tr_orig, "D_VOL", 1.0) 
            
            reaper.SetTrackColor(tr_orig, reaper.ColorToNative(150, 100, 255))
        end

        -- Finalize: Set Cursor to 0 and Scroll View
        reaper.SetEditCurPos(0, false, false)
        reaper.CSurf_OnScroll(0, 0) -- Scroll to start

        log("Session Loaded Completely.")
      
      elseif data.action == "SET_BPM" then
          if data.bpm then
             log("GuitarOS: Updating BPM to " .. data.bpm)
             -- Remove all tempo markers first to ensure clean state (or just update the first one)
             -- To be safe, let's just set the project tempo.
             -- reaper.SetCurrentBPM(0, tonumber(data.bpm), true) -- This changes playrate, not project tempo usually
             
             -- Better: Update the first tempo marker
             reaper.SetTempoTimeSigMarker(0, -1, 0, -1, -1, tonumber(data.bpm), 0, 0, false)
             reaper.UpdateTimeline()
          end
      end
    end
  end

  reaper.defer(main)
end

log("GuitarOS Listener Running...")
main()
