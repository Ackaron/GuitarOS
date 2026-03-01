-- GuitarOS Listener Script (Snapshot_3 Logic)
-- Polls reaper_cmd.json via pointer file in TEMP

local last_timestamp = 0

function log(msg)
  reaper.ShowConsoleMsg(msg .. "\n")
end

-- Dynamic path resolution: re-read pointer on EVERY poll so dev/installed paths always match
local function get_cmd_path()
  local temp = os.getenv("TEMP")
  if temp then
    local pointer = temp .. "\\guitaros_cmd_path.txt"
    local f = io.open(pointer, "r")
    if f then
      local p = f:read("*l")
      f:close()
      if p and p ~= "" then
        return p:gsub("\\", "/")
      end
    end
  end
  return nil
end

-- Simple JSON parser
function parse_json(str)
  if not str or str == "" then return nil end
  local data = {}
  data.action = str:match('"action":%s*"(.-)"')
  data.timestamp = str:match('"timestamp":%s*(%d+)')
  data.bpm = str:match('"bpm":%s*(%-?%d+%.?%d*)')
  data.backing = str:match('"backing":%s*"(.-)"')
  data.original = str:match('"original":%s*"(.-)"')
  
  data.command = str:match('"command":%s*"(.-)"')
  data.trackIndex = str:match('"trackIndex":%s*(%d+)')
  
  local val = str:match('"value":%s*(%-?%d+%.?%d*)')
  if val then data.value = val end
  
  if str:match('"value":%s*true') then data.value = 1 end
  if str:match('"value":%s*false') then data.value = 0 end
  
  return data
end

function read_file(path)
    if not path then return nil end
    local f = io.open(path, "r")
    if not f then return nil end
    local content = f:read("*all")
    f:close()
    return content
end

function main()
  -- Always re-read pointer file so path is current even after app restart
  local json_path = get_cmd_path()
  if not json_path then
    reaper.defer(main)
    return
  end

  local content = read_file(json_path)
  if content and content ~= "" then
    local data = parse_json(content)
    
    if data and data.timestamp and tonumber(data.timestamp) > last_timestamp then
      last_timestamp = tonumber(data.timestamp)
      
      if data.action == "LOAD_EXERCISE" then
        log("GuitarOS (Snapshot_3): Loading Exercise...")

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
        
        -- Record Arm Off
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
            
            -- Unmuted by default per Snapshot_3
            reaper.SetMediaTrackInfo_Value(tr_orig, "B_MUTE", 0)
            reaper.SetMediaTrackInfo_Value(tr_orig, "D_VOL", 1.0) 
            
            reaper.SetTrackColor(tr_orig, reaper.ColorToNative(150, 100, 255))
        end

        -- Finalize: Set Cursor to 0 and Scroll View
        reaper.SetEditCurPos(0, false, false)
        reaper.CSurf_OnScroll(0, 0) -- Scroll to start
        
        -- FORCE UI REDRAW so the tracks appear immediately
        reaper.TrackList_AdjustWindows(false)
        reaper.UpdateArrange()

        log("Session Loaded Completely.")
      
      elseif data.action == "SET_BPM" then
          if data.bpm then
             log("GuitarOS: Updating BPM to " .. data.bpm)
             reaper.SetTempoTimeSigMarker(0, -1, 0, -1, -1, tonumber(data.bpm), 0, 0, false)
             reaper.UpdateTimeline()
          end
      elseif data.action == "TRANSPORT" then
          if data.command == "play" then reaper.Main_OnCommand(1007, 0)
          elseif data.command == "stop" then 
              reaper.Main_OnCommand(1016, 0) -- Stop
              reaper.Main_OnCommand(40042, 0) -- Go to start of project
          elseif data.command == "record" then reaper.Main_OnCommand(1013, 0)
          elseif data.command == "pause" then reaper.Main_OnCommand(1008, 0)
          elseif data.command == "rewind" then reaper.Main_OnCommand(40042, 0)
          elseif data.command == "metronome" then reaper.Main_OnCommand(40364, 0)
          end
      elseif data.action == "SET_VOLUME" then
          if data.trackIndex and data.value then
              -- Track indices from frontend are 1-based (from old HTTP API)
              local tr = reaper.GetTrack(0, tonumber(data.trackIndex) - 1)
              if tr then 
                  reaper.SetMediaTrackInfo_Value(tr, "D_VOL", tonumber(data.value)) 
                  reaper.TrackList_AdjustWindows(false)
              end
          end
      elseif data.action == "SET_MUTE" then
          if data.trackIndex and data.value then
              local tr = reaper.GetTrack(0, tonumber(data.trackIndex) - 1)
              if tr then 
                  reaper.SetMediaTrackInfo_Value(tr, "B_MUTE", tonumber(data.value)) 
                  reaper.TrackList_AdjustWindows(false)
              end
          end
      end
    end
  end

  reaper.defer(main)
end

log("GuitarOS Listener Running (Snapshot_3 Logic)...")
main()
