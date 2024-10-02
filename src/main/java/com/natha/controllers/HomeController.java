package com.natha.controllers;

import com.natha.services.GpxAnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@Controller
public class HomeController {

    @Autowired
    private GpxAnalysisService gpxAnalysisService;

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @PostMapping("/analyze")
    @ResponseBody
    public Map<String, Object> analyzeGpx(@RequestParam("file") MultipartFile file) throws Exception {
        return gpxAnalysisService.analyzeGpx(file);
    }

    @GetMapping("/map")
    public String map() {
        return "map";
    }
}