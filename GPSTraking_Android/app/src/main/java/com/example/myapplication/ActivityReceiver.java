package com.example.myapplication;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.google.android.gms.location.ActivityRecognitionResult;
import com.google.android.gms.location.DetectedActivity;

public class ActivityReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (ActivityRecognitionResult.hasResult(intent)) {
            ActivityRecognitionResult result = ActivityRecognitionResult.extractResult(intent);
            DetectedActivity mostProbableActivity = result.getMostProbableActivity();
            String activityType = getActivityName(mostProbableActivity.getType());

            if (context instanceof MainActivity) {
                ((MainActivity) context).updateActivity(activityType);
            }
        }
    }

    private String getActivityName(int type) {
        switch (type) {
            case DetectedActivity.STILL: return "Still";
            case DetectedActivity.WALKING: return "Walking";
            case DetectedActivity.RUNNING: return "Running";
            case DetectedActivity.ON_BICYCLE: return "Bicycling";
            case DetectedActivity.IN_VEHICLE: return "Driving";
            case DetectedActivity.ON_FOOT: return "On Foot";
            default: return "Unknown";
        }
    }
}
