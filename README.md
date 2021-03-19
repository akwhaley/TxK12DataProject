# Exploring Texas Public School Accountability Ratings 2018-2019

In this application, users can explore how mean accountability rating scores for public school districts in Texas relates to student demographics by selecting different variables to show on the horizontal and vertical axes of a scatterplot.

## About the data
#### Student demographic variables include:
- `EconomicallyDisadvantagedPct`
  Percent of students who qualify for free or reduced priced lunch

- `LEPPct`
  Percent of students with Limited English Proficiency

- `SPEDPct`
  Percent of students with Special Education distinction

- `StudentCount`
  Number of students

#### Accountability Scores include:
- `StudentAchievement` - Domain 1
- `AcademicGrowith` - Domain 2
- `ClosingTheGaps` - Domain 3
- `OverallScore`
The overall score is determined by averaging the Closing the Gaps score with the higher of the Student Achievement or Academic Growth.  You can read more about the domains [here](https://tea.texas.gov/texas-schools/accountability/academic-accountability).

Also included in the district data is an 'overperformance' score.  I compute this score by training a model to use a school's student demographics to predict it's overall score based on the average score of similar schools.  The 'overperformance' score is the difference between the prediction from the model and the school's actual overall score.  

## Data Sources
- District and campus level accountability and some student demographic data come from the [Texas Education Agency](https://rptsvr1.tea.texas.gov/perfreport/account/2019/srch.html)
- District characteristics come from the [National Center for Education Statistics](https://nces.ed.gov/ccd/districtsearch/)
